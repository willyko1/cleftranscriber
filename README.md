# ClefTranscriber

A static dashboard with sheet-music image upload and a Vercel serverless API adapter.

**Current status:** image preview works. The animated audio transcript and metrics are demo content. This repository does not contain a sheet-music recognition/conversion engine. Hosting it does not enable actual transcription. Without a connected engine, the API returns an explicit `503` message.

## Deploy to Vercel

Import `willyko1/cleftranscriber` at https://vercel.com/new and select the branch containing this configuration.

- Framework preset: **Other**
- Root directory: repository root
- Build command: `npm run build` (set in `vercel.json`)
- Output directory: `dist` (set in `vercel.json`)
- Node.js: **22.x** (set in `package.json`)

The build copies only `index.html`, `styles.css`, and `app.js` into the public output. Vercel deploys `api/transcribe.js` separately as a function. No database, persistent server, or environment variables are needed to publish the preview UI. Existing Render configuration remains available for static hosting.

## Connect actual transcription

Once an actual sheet-music conversion service is available, set these **server-side** environment variables in the Vercel project and redeploy:

| Variable | Purpose |
| --- | --- |
| `TRANSCRIPTION_API_URL` | Full HTTPS URL of a service implementing the contract below |
| `TRANSCRIPTION_API_KEY` | Optional bearer token for that service |

The adapter is not a model-specific integration. Do not supply an arbitrary OpenAI or other model endpoint: its request/response contract must match. Credentials must never go into `app.js` or a committed environment file. A provider may have its own costs; none is selected or provisioned by this repository. Before enabling a paid provider on a public deployment, configure appropriate authentication, abuse controls, and provider spending limits.

### API contract

The browser calls `POST /api/transcribe` using multipart form data:

- `sheetMusic`: nonempty PNG, JPEG, or WebP image, at most 4 MiB
- `clef`: `treble`, `alto`, `tenor`, or `bass`

The Vercel function validates the upload and forwards these same fields to the configured service. A successful service response must be PNG, JPEG, or WebP image bytes, at most 4 MiB. Provider requests time out after 50 seconds; the Vercel function has a 60-second limit. The upload cap leaves space for multipart overhead below Vercel's 4.5 MB request limit. Requests and results are not persisted by this app.

Errors use JSON `{ "error": "Readable message" }`. An unconfigured engine returns `503`; invalid input returns `400`/`413`/`415`; upstream failure returns `502` or `504`.

## Local development

Requires Node.js 22.x. No runtime npm dependencies are required.

```bash
npm ci
npm test
npm run build
```

For Vercel routing and functions locally:

```bash
npm run dev
```

The command downloads Vercel CLI if needed and may prompt you to link a Vercel project. Put optional local server variables in `.env.local` (ignored by Git).

For only the static preview, `python3 -m http.server 8000` still works, but Python's static server does not run `/api/transcribe`.
