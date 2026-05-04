"use client";

import { useCallback, useRef, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ResultPreview from "@/components/ResultPreview";
import TokenSettings from "@/components/TokenSettings";
import { transformImage, ReplicateError } from "@/lib/replicate";

const LOADING_MESSAGES = [
  "Summoning whiskers…",
  "Fluffing the fur…",
  "Calibrating purrs…",
  "Sharpening tiny claws…",
  "Tuning cat-eye reflections…",
];

type Status = "idle" | "loading" | "done" | "error";

export default function Page() {
  const [token, setToken] = useState("");
  const [originalDataUrl, setOriginalDataUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const abortRef = useRef<AbortController | null>(null);

  const handleFileSelected = useCallback((file: File, dataUrl: string) => {
    setOriginalFile(file);
    setOriginalDataUrl(dataUrl);
    setResultUrl(null);
    setStatus("idle");
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setOriginalFile(null);
    setOriginalDataUrl(null);
    setResultUrl(null);
    setStatus("idle");
    setError(null);
  }, []);

  const handleTransform = useCallback(async () => {
    if (!originalFile || !originalDataUrl) return;

    if (!token) {
      setError(
        "Add your Replicate API token in the Settings panel above before transforming."
      );
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);
    setResultUrl(null);

    let messageIndex = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    const messageTimer = setInterval(() => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[messageIndex]);
    }, 2200);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const output = await transformImage(token, originalDataUrl, {
        signal: controller.signal,
      });
      setResultUrl(output);
      setStatus("done");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      const message =
        err instanceof ReplicateError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong while talking to the cat oracle.";
      setError(message);
      setStatus("error");
    } finally {
      clearInterval(messageTimer);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [originalFile, originalDataUrl, token]);

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

        <div className="mb-6 animate-fade-in">
          <TokenSettings onTokenChange={setToken} />
        </div>

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
          Made with <span aria-hidden>🐾</span> for cat people. Your image and
          token go directly from this page to Replicate — nothing is stored on
          a server.
        </footer>
      </div>
    </main>
  );
}
