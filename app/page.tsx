"use client";

import { useCallback, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ResultPreview from "@/components/ResultPreview";

const LOADING_MESSAGES = [
  "Summoning whiskers…",
  "Fluffing the fur…",
  "Calibrating purrs…",
  "Sharpening tiny claws…",
  "Tuning cat-eye reflections…",
];

type Status = "idle" | "loading" | "done" | "error";

export default function Page() {
  const [originalDataUrl, setOriginalDataUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  const handleFileSelected = useCallback((file: File, dataUrl: string) => {
    setOriginalFile(file);
    setOriginalDataUrl(dataUrl);
    setResultUrl(null);
    setStatus("idle");
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setOriginalFile(null);
    setOriginalDataUrl(null);
    setResultUrl(null);
    setStatus("idle");
    setError(null);
  }, []);

  const handleTransform = useCallback(async () => {
    if (!originalFile) return;

    setStatus("loading");
    setError(null);
    setResultUrl(null);

    // Cycle through fun loading copy while we wait.
    let messageIndex = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    const messageTimer = setInterval(() => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[messageIndex]);
    }, 2200);

    try {
      const formData = new FormData();
      formData.append("image", originalFile);

      const response = await fetch("/api/transform", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.image) {
        const message =
          payload?.error ||
          "We couldn't transform that image. Please try a different photo.";
        throw new Error(message);
      }

      setResultUrl(payload.image as string);
      setStatus("done");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while talking to the cat oracle.";
      setError(message);
      setStatus("error");
    } finally {
      clearInterval(messageTimer);
    }
  }, [originalFile]);

  return (
    <main className="min-h-dvh px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="text-center mb-10 sm:mb-14 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-whisker bg-white/70 px-4 py-1.5 text-sm text-purr shadow-soft">
            <span aria-hidden>🐾</span>
            <span>CatMorph</span>
          </div>
          <h1 className="mt-5 font-display text-4xl sm:text-6xl font-semibold tracking-tight text-ink">
            Turn Yourself Into a Cat
          </h1>
          <p className="mt-4 text-base sm:text-lg text-purr/80 max-w-xl mx-auto">
            Upload a photo and let the whiskers take over.
          </p>
        </header>

        <section className="card p-5 sm:p-8 animate-fade-in">
          <ImageUploader
            previewUrl={originalDataUrl}
            disabled={status === "loading"}
            onFileSelected={handleFileSelected}
            onClear={handleReset}
          />

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-purr/70">
              JPG, PNG, or WebP. Up to 10 MB. One person works best.
            </p>
            <div className="flex gap-2">
              {originalDataUrl && status !== "loading" && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-ghost"
                >
                  Start over
                </button>
              )}
              <button
                type="button"
                onClick={handleTransform}
                disabled={!originalFile || status === "loading"}
                className="btn-primary"
              >
                {status === "loading" ? (
                  <>
                    <span
                      className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
                      aria-hidden
                    />
                    {loadingMessage}
                  </>
                ) : (
                  <>
                    <span aria-hidden>🐱</span>
                    Turn Into Cat
                  </>
                )}
              </button>
            </div>
          </div>

          {status === "error" && error && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
        </section>

        {(status === "loading" || status === "done") && originalDataUrl && (
          <section className="mt-8 animate-fade-in">
            <ResultPreview
              originalUrl={originalDataUrl}
              resultUrl={resultUrl}
              isLoading={status === "loading"}
            />
          </section>
        )}

        <footer className="mt-16 text-center text-xs text-purr/60">
          Made with <span aria-hidden>🐾</span> for cat people. Your images are sent
          to a third-party AI provider for processing.
        </footer>
      </div>
    </main>
  );
}
