"use client";

import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { MAX_AUDIO_BYTES } from "@/lib/replicate";

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
];

type Props = {
  file: File | null;
  disabled?: boolean;
  onFileSelected: (file: File, dataUrl: string) => void;
  onClear: () => void;
};

export default function AudioUploader({
  file,
  disabled,
  onFileSelected,
  onClear,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hover, setHover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const picked = files?.[0];
      if (!picked) return;

      const looksLikeAudio =
        picked.type.startsWith("audio/") ||
        /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(picked.name);
      if (!looksLikeAudio) {
        setError("That doesn't look like an audio file. Try MP3, WAV, FLAC, OGG, or M4A.");
        return;
      }

      if (picked.size > MAX_AUDIO_BYTES) {
        const mb = (picked.size / (1024 * 1024)).toFixed(1);
        setError(`File is ${mb} MB — please keep it under 25 MB. Try compressing to MP3.`);
        return;
      }

      setError(null);
      const reader = new FileReader();
      reader.onerror = () =>
        setError("Couldn't read that file. Try a different one.");
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== "string") {
          setError("Couldn't read that file. Try a different one.");
          return;
        }
        onFileSelected(picked, dataUrl);
      };
      reader.readAsDataURL(picked);
    },
    [onFileSelected]
  );

  const onChange = (e: ChangeEvent<HTMLInputElement>) =>
    handleFiles(e.target.files);

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setHover(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!disabled) setHover(true);
  };

  const onDragLeave = () => setHover(false);

  const sizeLabel = file
    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    : "";

  return (
    <div>
      <label
        htmlFor={inputId}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={[
          "relative flex flex-col items-center justify-center text-center",
          "rounded-3xl border-2 border-dashed px-6 py-12 sm:py-16 transition",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          hover
            ? "border-cyan-400 bg-cyan-400/10"
            : "border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]",
        ].join(" ")}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",") + ",.mp3,.wav,.flac,.ogg,.m4a,.aac"}
          className="sr-only"
          onChange={onChange}
          disabled={disabled}
        />

        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-2xl text-white shadow-glow">
              ♫
            </div>
            <div>
              <p className="font-medium text-white truncate max-w-[24rem]">
                {file.name}
              </p>
              <p className="text-sm text-white/50">{sizeLabel}</p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onClear();
                }}
                className="text-sm text-white/60 hover:text-white underline underline-offset-4"
              >
                Choose a different track
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl text-white/70">
              ↑
            </div>
            <p className="text-lg font-medium text-white">
              Drop a song here, or click to choose a file
            </p>
            <p className="text-sm text-white/50">
              MP3, WAV, FLAC, OGG, M4A · up to 25 MB
            </p>
          </div>
        )}
      </label>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}
