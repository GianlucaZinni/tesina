from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse


BASE_DIR = Path(__file__).resolve().parents[4]
router = APIRouter()


@router.get("/dist/{filename:path}")
def serve_dist_file(filename: str) -> FileResponse:
    """Return a file from the Vite build output directory."""
    file_path = BASE_DIR / "static" / "dist" / filename
    return FileResponse(file_path)