# cleftranscriber

ClefTranscriber is a sheet music image transcription service that converts uploaded scores into MusicXML and renders them in a selected clef.

## Local development

Install dependencies and run the API/frontend locally:

```bash
python3 -m pip install -r requirements.txt
uvicorn server:app --reload --port 8000
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

## Sheet music transcription API

The browser sends an uploaded sheet music image to `POST /api/transcribe` with a multipart form containing:

- `sheetMusic`: the uploaded image
- `clef`: `treble`, `alto`, `tenor`, or `bass`

The endpoint runs this pipeline:

1. Oemer recognizes the uploaded score as MusicXML.
2. Music21 applies the selected target clef.
3. Verovio renders the resulting MusicXML as an SVG image.

The API returns that SVG image to the frontend. OMR is CPU-intensive and may take several minutes for a large or low-quality score.
