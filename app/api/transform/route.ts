import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const CAT_PROMPT =
  "Transform the person in this image into a realistic cat version of themselves. " +
  "Preserve the original pose, camera angle, background, lighting, clothing silhouette, " +
  "and composition. Replace human facial features with feline features, including cat ears, " +
  "whiskers, fur texture, cat-like eyes, and a natural cat face shape. Make it playful, " +
  "high-quality, realistic, and visually coherent. Do not distort the background or add extra people.";

// =============================================================================
// IMAGE PROVIDER INTEGRATION
// -----------------------------------------------------------------------------
// This route uses Replicate's `black-forest-labs/flux-kontext-pro` model, which
// is purpose-built for image-to-image edits that follow a text instruction
// while preserving the input composition. To swap providers (e.g. OpenAI's
// `gpt-image-1` edit endpoint), replace the body of `runTransform` below — the
// rest of this file (validation, error handling, response shape) is provider
// agnostic.
// =============================================================================

async function runTransform(imageDataUrl: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      "Server is missing REPLICATE_API_TOKEN. Add it to your .env.local file."
    );
  }

  const replicate = new Replicate({ auth: token });
  const model =
    (process.env.REPLICATE_MODEL as `${string}/${string}` | `${string}/${string}:${string}`) ||
    "black-forest-labs/flux-kontext-pro";

  // Replicate accepts data URLs directly for image inputs, so we can forward
  // the user's photo without uploading it anywhere else.
  const output = await replicate.run(model, {
    input: {
      prompt: CAT_PROMPT,
      input_image: imageDataUrl,
      output_format: "png",
      safety_tolerance: 2,
    },
  });

  return await normalizeReplicateOutput(output);
}

// Replicate's SDK can return a string URL, an array of URLs, or a FileOutput
// stream depending on the model. Normalize all shapes to a single data URL or
// https URL we can return to the browser.
async function normalizeReplicateOutput(output: unknown): Promise<string> {
  const first = Array.isArray(output) ? output[0] : output;

  if (!first) {
    throw new Error("The image provider returned no output.");
  }

  if (typeof first === "string") {
    return first;
  }

  // FileOutput-like object exposed by recent versions of the Replicate SDK.
  if (typeof first === "object" && first !== null) {
    const candidate = first as {
      url?: () => URL | string;
      blob?: () => Promise<Blob>;
    };

    if (typeof candidate.blob === "function") {
      const blob = await candidate.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      const mime = blob.type || "image/png";
      return `data:${mime};base64,${buffer.toString("base64")}`;
    }

    if (typeof candidate.url === "function") {
      const value = candidate.url();
      return value instanceof URL ? value.toString() : String(value);
    }
  }

  throw new Error("Unexpected response shape from the image provider.");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: "Invalid form data. Please re-upload your image." },
        { status: 400 }
      );
    }

    const file = formData.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No image was uploaded." },
        { status: 400 }
      );
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, or WebP images are supported." },
        { status: 415 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Please upload a file under 10 MB." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const image = await runTransform(dataUrl);

    return NextResponse.json({ image });
  } catch (error) {
    console.error("[/api/transform] failed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "The cat oracle is unavailable right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
