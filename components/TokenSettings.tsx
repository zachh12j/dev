"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "catmorph.replicate_token";

type Props = {
  onTokenChange: (token: string) => void;
};

export default function TokenSettings({ onTokenChange }: Props) {
  const [token, setToken] = useState("");
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? "";
    setToken(stored);
    setDraft(stored);
    onTokenChange(stored);
    if (!stored) setOpen(true);
  }, [onTokenChange]);

  const save = () => {
    const trimmed = draft.trim();
    if (typeof window !== "undefined") {
      if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
    setToken(trimmed);
    onTokenChange(trimmed);
    setSavedAt(Date.now());
    if (trimmed) setOpen(false);
  };

  const clear = () => {
    setDraft("");
    setToken("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    onTokenChange("");
    setSavedAt(Date.now());
  };

  const masked = token ? `${token.slice(0, 4)}…${token.slice(-4)}` : "Not set";

  return (
    <div className="card p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>🔑</span>
          <span className="font-medium text-ink">Replicate API token</span>
          <span
            className={[
              "ml-1 rounded-full px-2 py-0.5 text-xs",
              token
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700",
            ].join(" ")}
          >
            {token ? `Saved · ${masked}` : "Not set"}
          </span>
        </span>
        <span className="text-purr/70 text-sm">
          {open ? "Hide" : "Edit"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-purr/80">
            Get a free token from{" "}
            <a
              href="https://replicate.com/account/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 text-paw"
            >
              replicate.com/account/api-tokens
            </a>
            . It is stored only in your browser&apos;s localStorage and sent
            directly to Replicate from this page.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="r8_..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 rounded-full border border-whisker bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-paw focus:shadow-glow"
            />
            <div className="flex gap-2">
              <button type="button" onClick={save} className="btn-primary !px-5 !py-2.5 text-sm">
                Save
              </button>
              {token && (
                <button type="button" onClick={clear} className="btn-ghost !px-4 !py-2 text-sm">
                  Clear
                </button>
              )}
            </div>
          </div>
          {savedAt && (
            <p className="text-xs text-emerald-700" key={savedAt}>
              {token ? "Token saved." : "Token cleared."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
