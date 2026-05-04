// Browser-side Replicate client.
//
// The original CatMorph used a Next.js API route to keep the Replicate token
// server-side. Static GitHub Pages can't run that route, so we call Replicate
// directly from the browser using a token the user pastes into the UI. The
// token is stored in localStorage on the visitor's own device — it is never
// committed to the repo and never leaves their machine except in requests
// to api.replicate.com.
//
// Replicate's REST API supports CORS for browser clients, so this works from
// any origin (including GitHub Pages).

const MODEL = "black-forest-labs/flux-kontext-pro";
const API_BASE = "https://api.replicate.com/v1";

const CAT_PROMPT =
  "Transform the person in this image into a realistic cat version of themselves. " +
  "Preserve the original pose, camera angle, background, lighting, clothing silhouette, " +
  "and composition. Replace human facial features with feline features, including cat ears, " +
  "whiskers, fur texture, cat-like eyes, and a natural cat face shape. Make it playful, " +
  "high-quality, realistic, and visually coherent. Do not distort the background or add extra people.";

type PredictionStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

type Prediction = {
  id: string;
  status: PredictionStatus;
  output: string | string[] | null;
  error: string | null;
  urls: { get: string; cancel: string };
};

export class ReplicateError extends Error {}

export async function transformImage(
  token: string,
  imageDataUrl: string,
  options: { signal?: AbortSignal } = {}
): Promise<string> {
  if (!token) {
    throw new ReplicateError(
      "Add your Replicate API token in Settings before transforming."
    );
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Kick off the prediction. Using the model-prediction endpoint avoids
  // having to look up a specific version ID.
  const startResponse = await fetch(
    `${API_BASE}/models/${MODEL}/predictions`,
    {
      method: "POST",
      headers,
      signal: options.signal,
      body: JSON.stringify({
        input: {
          prompt: CAT_PROMPT,
          input_image: imageDataUrl,
          output_format: "png",
          safety_tolerance: 2,
        },
      }),
    }
  );

  if (!startResponse.ok) {
    throw new ReplicateError(await readError(startResponse));
  }

  let prediction = (await startResponse.json()) as Prediction;

  // Poll until the prediction is done. Replicate edits typically take
  // 10–60s; we cap at 3 minutes total before giving up.
  const deadline = Date.now() + 3 * 60 * 1000;
  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled"
  ) {
    if (Date.now() > deadline) {
      throw new ReplicateError(
        "The cat oracle is taking longer than expected. Please try again."
      );
    }

    await sleep(2000, options.signal);

    const pollResponse = await fetch(prediction.urls.get, {
      headers,
      signal: options.signal,
    });
    if (!pollResponse.ok) {
      throw new ReplicateError(await readError(pollResponse));
    }
    prediction = (await pollResponse.json()) as Prediction;
  }

  if (prediction.status !== "succeeded") {
    throw new ReplicateError(
      prediction.error ||
        "The image provider couldn't produce a result for that photo."
    );
  }

  const output = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;

  if (typeof output !== "string") {
    throw new ReplicateError("Unexpected response shape from the image provider.");
  }

  return output;
}

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string; title?: string };
    if (data?.detail) return data.detail;
    if (data?.title) return data.title;
  } catch {
    // fall through
  }
  if (response.status === 401) {
    return "Replicate rejected the token. Double-check it in Settings.";
  }
  if (response.status === 402) {
    return "Your Replicate account is out of credit for this model.";
  }
  if (response.status === 429) {
    return "Rate limited by Replicate. Wait a moment and try again.";
  }
  return `Replicate request failed (${response.status}).`;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort);
  });
}
