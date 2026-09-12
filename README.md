# cleftranscriber

ClefTranscriber is a static landing/dashboard experience for a live transcription product.

## Local development

Serve the workspace locally:

```bash
python3 -m http.server 8000
```

Then visit <http://127.0.0.1:8000>.

## Render deployment

This repository includes a Render static service configuration in `render.yaml`:

```yaml
services:
  - type: web
    name: cleftranscriber-live
    runtime: static
    buildCommand: ""
    staticPublishPath: ./
```

Create a new Render Web Service using the repository and point the publish directory to the project root if Render asks for a build path.
