from pathlib import Path
import subprocess
import tempfile
from xml.etree import ElementTree

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from music21 import clef, converter
import verovio


ROOT = Path(__file__).parent
ALLOWED_CLEFS = {
    "treble": clef.TrebleClef,
    "alto": clef.AltoClef,
    "tenor": clef.TenorClef,
    "bass": clef.BassClef,
}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

app = FastAPI(title="ClefTranscriber API")


@app.get("/healthz")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


def apply_target_clef(musicxml_path: Path, target_clef: str, output_path: Path) -> None:
    score = converter.parse(str(musicxml_path))
    clef_type = ALLOWED_CLEFS[target_clef]

    for part in score.parts:
        for existing_clef in list(part.recurse().getElementsByClass(clef.Clef)):
            part.remove(existing_clef, recurse=True)
        part.insert(0, clef_type())

    score.write("musicxml", fp=str(output_path))


def render_musicxml(musicxml_path: Path) -> bytes:
    toolkit = verovio.toolkit()
    toolkit.setOptions({
        "adjustPageHeight": True,
        "breaks": "none",
        "pageWidth": 1800,
        "scale": 45,
    })
    toolkit.loadFile(str(musicxml_path))
    return toolkit.renderToSVG(1).encode("utf-8")


def find_musicxml(output_dir: Path) -> Path:
    candidates = sorted(output_dir.glob("*.musicxml")) + sorted(output_dir.glob("*.xml"))
    if not candidates:
        raise RuntimeError("OMR did not produce a MusicXML file.")
    return candidates[0]


@app.post("/api/transcribe")
def transcribe(sheetMusic: UploadFile = File(...), clef_name: str = Form(..., alias="clef")) -> Response:
    if clef_name not in ALLOWED_CLEFS:
        raise HTTPException(status_code=400, detail="Unsupported clef.")
    if not sheetMusic.content_type or not sheetMusic.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Please upload an image file.")

    with tempfile.TemporaryDirectory() as temporary_directory:
        temporary_path = Path(temporary_directory)
        input_suffix = Path(sheetMusic.filename or "score.png").suffix.lower()
        if input_suffix not in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}:
            input_suffix = ".png"
        input_path = temporary_path / f"sheet-music-image{input_suffix}"
        output_directory = temporary_path / "omr-output"
        output_directory.mkdir()

        total_bytes = 0
        with input_path.open("wb") as input_file:
            while chunk := sheetMusic.file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_SIZE:
                    raise HTTPException(status_code=413, detail="Images must be smaller than 10 MB.")
                input_file.write(chunk)

        try:
            subprocess.run(
                ["oemer", str(input_path), "--output-path", str(output_directory)],
                check=True,
                capture_output=True,
                text=True,
                timeout=300,
            )
            detected_musicxml = find_musicxml(output_directory)
            transcribed_musicxml = temporary_path / "transcribed.musicxml"
            apply_target_clef(detected_musicxml, clef_name, transcribed_musicxml)
            rendered_svg = render_musicxml(transcribed_musicxml)
        except subprocess.TimeoutExpired as error:
            raise HTTPException(status_code=504, detail="Transcription took too long.") from error
        except (OSError, ElementTree.ParseError, RuntimeError, ValueError) as error:
            raise HTTPException(status_code=422, detail=f"Could not transcribe this score: {error}") from error
        finally:
            sheetMusic.file.close()

    return Response(content=rendered_svg, media_type="image/svg+xml")


app.mount("/", StaticFiles(directory=ROOT, html=True), name="frontend")