"use client";

import { ChangeEvent, DragEvent, useCallback, useRef, useState } from "react";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  previewUrl: string | null;
  disabled?: boolean;
  onFileSelected: (file: File, dataUrl: string) => void;
  onClear: () => void;
};

export default function ImageUploader({
  previewUrl,
  disabled,
  onFileSelected,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateAndLoad = useCallback(
    (file: File) => {
      setLocalError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setLocalError("Please upload a JPG, PNG, or WebP image.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setLocalError("That image is over 10 MB. Try a smaller one.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onFileSelected(file, reader.result);
        }
      };
      reader.onerror = () => {
        setLocalError("We couldn't read that file. Please try another.");
      };
      reader.readAsDataURL(file);
    },
    [onFileSelected]
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndLoad(file);
    // Reset so selecting the same file again still triggers change.
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndLoad(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      {!previewUrl ? (
        <div
          role="button"
          tabIndex={0}
          aria-disabled={disabled}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={[
            "group relative flex flex-col items-center justify-center text-center",
            "rounded-2xl border-2 border-dashed transition-colors",
            "px-6 py-14 sm:py-20 cursor-pointer select-none",
            isDragging
              ? "border-paw bg-paw/5"
              : "border-whisker bg-white/60 hover:bg-white",
            disabled ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <div className="text-4xl sm:text-5xl mb-3" aria-hidden>
            🐾
          </div>
          <p className="text-lg font-semibold text-ink">
            Drag &amp; drop a photo here
          </p>
          <p className="mt-1 text-sm text-purr/70">
            or <span className="underline underline-offset-2">click to browse</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            onChange={handleChange}
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-whisker bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview of your uploaded photo"
            className="w-full max-h-[480px] object-contain bg-cream"
          />
          {!disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-ink shadow-soft hover:bg-white"
            >
              Replace
            </button>
          )}
        </div>
      )}

      {localError && (
        <p
          role="alert"
          className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
        >
          {localError}
        </p>
      )}
    </div>
  );
}
