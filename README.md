# Stemly

> Split a song into vocals, drums, bass, and other — then mix them in your browser.

Stemly is a small **fully-static** Next.js app that takes an audio file and
returns the four separated stems using AI. It's designed to be hosted on
GitHub Pages.

## Tech stack

- **Next.js 14** (App Router, `output: "export"`) + **React 18** + **TypeScript**
- **Tailwind CSS** for styling
- **Replicate** as the model provider, running Meta's
  [Demucs](https://github.com/facebookresearch/demucs) (`cjwbw/demucs`) —
  called directly from the browser
- A multi-track mixer with per-stem volume, mute, and solo
- **GitHub Actions** + **GitHub Pages** for hosting

## How auth works (important)

Because GitHub Pages can only serve static files, there is no backend to
hold a secret API key. Instead:

- The visitor pastes **their own** Replicate API token into the in-app
  Settings panel.
- The token is saved to that visitor's `localStorage`.
- Requests go directly from the visitor's browser to `api.replicate.com`.
- Nothing is committed to the repo and nothing is stored on a server we
  control.

This is fine for a personal demo. If you ever want to expose Stemly publicly
without making each visitor bring their own token, host it on a platform
that supports server functions (Vercel, Netlify, Cloudflare Pages with
Functions) and put the Replicate call back into a server route.

## Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, paste a Replicate token in the Settings panel,
drop in a song, and click **Separate Stems**.

Get a token at <https://replicate.com/account/api-tokens>.

## Deploy to GitHub Pages

1. Push this repo to GitHub (it already lives at the configured remote).
2. In the repo settings → **Pages**, set the source to **GitHub Actions**.
3. Push to `main` (or any `claude/*` branch). The workflow at
   `.github/workflows/deploy.yml` will build the static site and publish it.
4. The site will be available at
   `https://<your-user>.github.io/<repo>/`.

The workflow automatically passes `NEXT_PUBLIC_BASE_PATH=/<repo>` so all
asset URLs resolve correctly under the repo subpath.

## How separation works

1. The user picks/drops an MP3, WAV, FLAC, OGG, or M4A under 25 MB.
2. The browser reads the file as a base64 data URL.
3. `lib/replicate.ts` POSTs to
   `https://api.replicate.com/v1/models/cjwbw/demucs/predictions` with
   `stem: "none"` (return all four stems) and polls for completion.
4. The returned object has URLs for each stem:
   `{ vocals, drums, bass, other }`.
5. The mixer loads each stem into a synced `<audio>` element and exposes
   per-stem volume sliders, mute (M), and solo (S) — plus per-stem
   download buttons.

## Limits

- **25 MB** upload cap (base64 encoding bloats the request body).
- **30 s – 3 min** typical separation time on Replicate's GPU pool.
- **MP3 320 kbps** stems by default. Change `output_format` in
  `lib/replicate.ts` if you'd rather have WAV/FLAC.
- The mixer assumes all four stems share the same length (they do — Demucs
  separates the original mix without trimming it).

## Swapping the separation provider

The provider call lives in `lib/replicate.ts` (`separateStems`). Replace it
with a call to your provider of choice — for example, a self-hosted Demucs
endpoint or `ryan5453/demucs` — and keep the `Stems` shape (an object with
`vocals`, `drums`, `bass`, `other` URLs). The rest of the app is
provider-agnostic.

## Project layout

```
.github/workflows/deploy.yml   # Pages build + deploy
app/
  layout.tsx                   # Root layout + metadata
  page.tsx                     # Main flow: upload → separate → mix
  globals.css                  # Tailwind base + dark theme
components/
  AudioUploader.tsx            # Drag/drop + file-picker for audio
  StemMixer.tsx                # Synced 4-track player with mute/solo/volume
  TokenSettings.tsx            # Replicate token input (localStorage-backed)
lib/
  replicate.ts                 # Browser-side Replicate REST client + Demucs
public/.nojekyll               # Tells Pages not to run Jekyll
```

## Scripts

| Command         | Description                                          |
| --------------- | ---------------------------------------------------- |
| `npm run dev`   | Start the dev server on port 3000                    |
| `npm run build` | Build the static site into `out/`                    |
| `npm run lint`  | Run Next.js' built-in ESLint checks                  |

## Notes

- One song per upload. Mono and stereo both work.
- Best results on full mixes; very quiet or all-vocal tracks confuse Demucs.
- The mixer plays back the stems Replicate returned — there's no waveform
  rendering yet; pull requests welcome.
