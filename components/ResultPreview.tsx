"use client";

import { useCallback } from "react";

type Props = {
  originalUrl: string;
  resultUrl: string | null;
  isLoading: boolean;
};

export default function ResultPreview({
  originalUrl,
  resultUrl,
  isLoading,
}: Props) {
  const handleDownload = useCallback(async () => {
    if (!resultUrl) return;
    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catmorph-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in a new tab so the user can save manually.
      window.open(resultUrl, "_blank", "noopener,noreferrer");
    }
  }, [resultUrl]);

  return (
    <div className="card p-5 sm:p-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl sm:text-3xl text-ink">
          {isLoading ? "Working some cat magic…" : "Meet your cat self"}
        </h2>
        {resultUrl && !isLoading && (
          <button
            type="button"
            onClick={handleDownload}
            className="btn-primary !px-5 !py-2.5 text-sm"
          >
            <span aria-hidden>⬇</span>
            Download
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Panel label="Original">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={originalUrl}
            alt="Original photo"
            className="w-full h-full object-contain bg-cream"
          />
        </Panel>

        <Panel label="Cat version">
          {isLoading || !resultUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-whisker to-cream">
              <div className="text-4xl animate-pulse-soft" aria-hidden>
                🐱
              </div>
              <p className="text-sm font-medium text-purr animate-pulse-soft">
                Summoning whiskers…
              </p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resultUrl}
              alt="Cat-version of your photo"
              className="w-full h-full object-contain bg-cream"
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="relative rounded-2xl overflow-hidden border border-whisker bg-white aspect-square sm:aspect-[4/5]">
      {children}
      <figcaption className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-purr shadow-soft">
        {label}
      </figcaption>
    </figure>
  );
}
