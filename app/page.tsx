"use client";

import { useCallback, useRef, useState } from "react";
import AudioUploader from "@/components/AudioUploader";
import StemMixer from "@/components/StemMixer";
import TokenSettings from "@/components/TokenSettings";
import {
  ReplicateError,
  separateStems,
  type Stems,
} from "@/lib/replicate";

const LOADING_MESSAGES = [
  "Listening to the track…",
  "Isolating vocals…",
  "Picking out the drums…",
  "Pulling the bassline…",
  "Untangling the rest…",
  "Polishing the stems…",
];

type Status = "idle" | "loading" | "done" | "error";

export default function Page() {
  const [token, setToken] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [stems, setStems] = useState<Stems | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const abortRef = useRef<AbortController | null>(null);

  const handleFileSelected = useCallback((file: File, dataUrl: string) => {
    setAudioFile(file);
    setAudioDataUrl(dataUrl);
    setStems(null);
    setStatus("idle");
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setAudioFile(null);
    setAudioDataUrl(null);
    setStems(null);
    setStatus("idle");
    setError(null);
  }, []);

  const handleSeparate = useCallback(async () => {
    if (!audioFile || !audioDataUrl) return;

    if (!token) {
      setError(
        "Add your Replicate API token in the Settings panel above before separating."
      );
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);
    setStems(null);

    let messageIndex = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    const messageTimer = setInterval(() => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[messageIndex]);
    }, 2400);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await separateStems(token, audioDataUrl, {
        signal: controller.signal,
      });
      setStems(result);
      setStatus("done");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      const message =
        err instanceof ReplicateError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Something went wrong while talking to Replicate.";
      setError(message);
      setStatus("error");
    } finally {
      clearInterval(messageTimer);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [audioFile, audioDataUrl, token]);

  return (
    <main className="min-h-dvh px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <header className="text-center mb-10 sm:mb-14 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-white/80 shadow-soft">
            <span aria-hidden>♫</span>
            <span>Stemly</span>
          </div>
          <h1 className="mt-5 font-display text-4xl sm:text-6xl font-semibold tracking-tight text-white">
            Split a song into its <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">stems</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/60 max-w-xl mx-auto">
            Upload a track and Stemly separates it into vocals, drums, bass,
            and the rest — then mix them in your browser.
          </p>
        </header>

        <div className="mb-6 animate-fade-in">
          <TokenSettings onTokenChange={setToken} />
        </div>

        <section className="card p-5 sm:p-8 animate-fade-in">
          <AudioUploader
            file={audioFile}
            disabled={status === "loading"}
            onFileSelected={handleFileSelected}
            onClear={handleReset}
          />

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-white/50">
              Demucs runs on Replicate. Expect 30 s – 3 min depending on track length.
            </p>
            <div className="flex gap-2">
              {audioFile && status !== "loading" && (
                <button type="button" onClick={handleReset} className="btn-ghost">
                  Start over
                </button>
              )}
              <button
                type="button"
                onClick={handleSeparate}
                disabled={!audioFile || status === "loading"}
                className="btn-primary"
              >
                {status === "loading" ? (
                  <>
                    <span
                      className="h-4 w-4 rounded-full border-2 border-slate-950/40 border-t-slate-950 animate-spin"
                      aria-hidden
                    />
                    {loadingMessage}
                  </>
                ) : (
                  <>
                    <span aria-hidden>✦</span>
                    Separate Stems
                  </>
                )}
              </button>
            </div>
          </div>

          {status === "error" && error && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </div>
          )}
        </section>

        {status === "done" && stems && audioFile && (
          <section className="mt-8 animate-fade-in">
            <StemMixer trackName={audioFile.name} stems={stems} />
          </section>
        )}

        <footer className="mt-16 text-center text-xs text-white/40">
          Made for music nerds. Your audio and token go directly from this page
          to Replicate — nothing is stored on a server we control. Powered by
          Demucs.
        </footer>
      </div>
    </main>
  );
}
