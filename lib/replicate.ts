// Browser-side Replicate client for audio stem separation.
//
// Stemly is a fully static site, so there is no backend to hold a Replicate
// API token. The visitor pastes their own token into the Settings panel; it
// is stored in localStorage and sent directly to api.replicate.com from
// their browser. Replicate's REST API supports CORS so this works from any
// origin (including GitHub Pages).
//
// We use the Demucs model (Meta's open-source music source separator) to
// split a single audio file into four stems: vocals, drums, bass, and other.

const MODEL = "cjwbw/demucs";
const API_BASE = "https://api.replicate.com/v1";

// Maximum upload size. Predictions are sent as base64 data URIs in the JSON
// request body, so very large files balloon the request. 25 MB raw → ~34 MB
// encoded, which still fits comfortably within Replicate's request limits.
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export const STEM_KEYS = ["vocals", "drums", "bass", "other"] as const;
export type StemKey = (typeof STEM_KEYS)[number];
export type Stems = Record<StemKey, string>;

type PredictionStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

type Prediction = {
  id: string;
  status: PredictionStatus;
  output: unknown;
  error: string | null;
  urls: { get: string; cancel: string };
};

export class ReplicateError extends Error {}

export type SeparateOptions = {
  signal?: AbortSignal;
  onStatus?: (status: PredictionStatus) => void;
};

export async function separateStems(
  token: string,
  audioDataUrl: string,
  options: SeparateOptions = {}
): Promise<Stems> {
  if (!token) {
    throw new ReplicateError(
      "Add your Replicate API token in Settings before separating a track."
    );
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const startResponse = await fetch(
    `${API_BASE}/models/${MODEL}/predictions`,
    {
      method: "POST",
      headers,
      signal: options.signal,
      body: JSON.stringify({
        input: {
          audio: audioDataUrl,
          stem: "none",
          model: "htdemucs",
          output_format: "mp3",
          mp3_bitrate: 320,
          shifts: 1,
        },
      }),
    }
  );

  if (!startResponse.ok) {
    throw new ReplicateError(await readError(startResponse));
  }

  let prediction = (await startResponse.json()) as Prediction;
  options.onStatus?.(prediction.status);

  // Demucs typically takes 30s–3min depending on track length. We cap at
  // 8 minutes total before giving up so a stuck prediction can't hang the UI.
  const deadline = Date.now() + 8 * 60 * 1000;
  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled"
  ) {
    if (Date.now() > deadline) {
      throw new ReplicateError(
        "Separation is taking longer than expected. Please try again with a shorter track."
      );
    }

    await sleep(2500, options.signal);

    const pollResponse = await fetch(prediction.urls.get, {
      headers,
      signal: options.signal,
    });
    if (!pollResponse.ok) {
      throw new ReplicateError(await readError(pollResponse));
    }
    prediction = (await pollResponse.json()) as Prediction;
    options.onStatus?.(prediction.status);
  }

  if (prediction.status !== "succeeded") {
    throw new ReplicateError(
      prediction.error ||
        "Demucs couldn't separate that track. Try a different file."
    );
  }

  return parseStems(prediction.output);
}

// Demucs returns an object of the form
// { vocals, drums, bass, other } with each value being a URL string.
// We accept any object whose values are strings and pick out the four stems
// we care about so we don't break if Replicate adds extra keys.
function parseStems(output: unknown): Stems {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ReplicateError("Unexpected response shape from Demucs.");
  }

  const record = output as Record<string, unknown>;
  const result: Partial<Stems> = {};
  for (const key of STEM_KEYS) {
    const value = record[key];
    if (typeof value !== "string" || !value) {
      throw new ReplicateError(
        `Demucs response was missing the "${key}" stem. Try again.`
      );
    }
    result[key] = value;
  }
  return result as Stems;
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
  if (response.status === 413) {
    return "Track is too large. Try compressing it to MP3 under 25 MB.";
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
