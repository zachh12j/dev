# 🐾 CatMorph

> Turn yourself into a cat. Upload a photo and let the whiskers take over.

CatMorph is a small full-stack Next.js app that takes a photo of a person and
returns a realistic cat-inspired version while preserving the original pose,
framing, lighting, and background.

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** for styling
- **Replicate** as the default image-to-image provider
  (`black-forest-labs/flux-kontext-pro`)

## Getting started

```bash
npm install
cp .env.example .env.local
# then open .env.local and paste in your REPLICATE_API_TOKEN
npm run dev
```

The app runs at <http://localhost:3000>.

### Get a Replicate API token

1. Sign up / sign in at <https://replicate.com>.
2. Open <https://replicate.com/account/api-tokens> and create a token.
3. Paste it into `.env.local` as `REPLICATE_API_TOKEN=...`.

> API keys are read on the server only and are never exposed to the browser.

## How it works

1. The browser sends the uploaded image to `POST /api/transform` as
   `multipart/form-data`.
2. The route validates the file (type + 10 MB cap), encodes it as a data URL,
   and calls Replicate with the cat-transformation prompt.
3. The route normalizes the provider's response into either a hosted URL or a
   base64 data URL and returns it as JSON: `{ "image": "..." }`.
4. The frontend shows the result side-by-side with the original and offers a
   download button.

## Swapping the image provider

The provider is isolated to a single function — `runTransform` in
[`app/api/transform/route.ts`](./app/api/transform/route.ts). Replace its body
with a call to your provider of choice (for example OpenAI's `gpt-image-1`
edit endpoint) and add the matching credentials to `.env.local`. The
validation, error handling, and response shape stay the same.

## Project layout

```
app/
  api/transform/route.ts   # Backend: validates upload + calls the AI provider
  layout.tsx               # Root layout + metadata
  page.tsx                 # Landing page wired to the components below
  globals.css              # Tailwind base + design tokens
components/
  ImageUploader.tsx        # Drag/drop + file-picker uploader with preview
  ResultPreview.tsx        # Side-by-side original vs. cat result + download
.env.example               # Required + optional environment variables
```

## Scripts

| Command         | Description                            |
| --------------- | -------------------------------------- |
| `npm run dev`   | Start the dev server on port 3000      |
| `npm run build` | Build the production bundle            |
| `npm run start` | Serve the production build             |
| `npm run lint`  | Run Next.js' built-in ESLint checks    |

## Notes

- Maximum upload size is 10 MB; accepted types are JPG, PNG, and WebP.
- Generation can take 10–60 seconds depending on the provider.
- One person per photo gives the best results.
