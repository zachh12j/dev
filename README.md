# 🐾 CatMorph

> Turn yourself into a cat. Upload a photo and let the whiskers take over.

CatMorph is a small **fully-static** Next.js app that takes a photo of a
person and returns a realistic cat-inspired version while preserving the
original pose, framing, lighting, and background. It is designed to be
hosted on GitHub Pages.

## Tech stack

- **Next.js 14** (App Router, `output: "export"`) + **React 18** + **TypeScript**
- **Tailwind CSS** for styling
- **Replicate** as the image-to-image provider
  (`black-forest-labs/flux-kontext-pro`), called directly from the browser
- **GitHub Actions** + **GitHub Pages** for hosting

## How auth works (important)

Because GitHub Pages can only serve static files, there is no backend to
hold a secret API key. Instead:

- The visitor pastes **their own** Replicate API token into the in-app
  Settings panel.
- The token is saved to that visitor's `localStorage`.
- Requests go directly from the visitor's browser to `api.replicate.com`.
- Nothing is committed to the repo and nothing is stored on a server.

This is fine for a personal demo. If you ever want to expose CatMorph
publicly without making each visitor bring their own token, host it on a
platform that supports server functions (Vercel, Netlify, Cloudflare Pages
with Functions) and put the Replicate call back into a server route.

## Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, paste a Replicate token in the Settings
panel, drop in a photo, and click **Turn Into Cat**.

Get a free Replicate token at
<https://replicate.com/account/api-tokens>.

## Deploy to GitHub Pages

1. Push this repo to GitHub (it already lives at the configured remote).
2. In the repo settings → **Pages**, set the source to **GitHub Actions**.
3. Push to `main` (or any `claude/*` branch). The workflow at
   `.github/workflows/deploy.yml` will build the static site and publish it.
4. The site will be available at
   `https://<your-user>.github.io/<repo>/`.

The workflow automatically passes `NEXT_PUBLIC_BASE_PATH=/<repo>` so all
asset URLs resolve correctly under the repo subpath.

## How the image transform works

1. The user picks/drops a JPG, PNG, or WebP under 10 MB.
2. The browser reads it as a base64 data URL.
3. `lib/replicate.ts` POSTs to
   `https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions`
   with the cat-transformation prompt and polls for completion.
4. The returned image URL is rendered side-by-side with the original; the
   download button fetches the result as a blob and saves it as
   `catmorph-<timestamp>.png`.

## Swapping the image provider

The provider is isolated to `lib/replicate.ts`. Replace `transformImage`
with a call to your provider of choice (for example OpenAI's
`gpt-image-1` edit endpoint) — the rest of the app is provider-agnostic.

## Project layout

```
.github/workflows/deploy.yml   # Pages build + deploy
app/
  layout.tsx                   # Root layout + metadata
  page.tsx                     # Landing page wired to the components below
  globals.css                  # Tailwind base + design tokens
components/
  ImageUploader.tsx            # Drag/drop + file-picker uploader with preview
  ResultPreview.tsx            # Side-by-side original vs. cat result + download
  TokenSettings.tsx            # Replicate token input (localStorage-backed)
lib/
  replicate.ts                 # Browser-side Replicate REST client
public/.nojekyll               # Tells Pages not to run Jekyll
```

## Scripts

| Command         | Description                                          |
| --------------- | ---------------------------------------------------- |
| `npm run dev`   | Start the dev server on port 3000                    |
| `npm run build` | Build the static site into `out/`                    |
| `npm run start` | (not used — site is fully static)                    |
| `npm run lint`  | Run Next.js' built-in ESLint checks                  |

## Notes

- Maximum upload size is 10 MB; accepted types are JPG, PNG, and WebP.
- Generation can take 10–60 seconds.
- One person per photo gives the best results.
