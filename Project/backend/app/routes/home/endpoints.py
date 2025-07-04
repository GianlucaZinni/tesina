from pathlib import Path
import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from backend.app.security import admin_required, owner_required


BASE_DIR = Path(__file__).resolve().parents[4]
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
templates.env.globals["get_flashed_messages"] = lambda *args, **kwargs: []

router = APIRouter()


@router.get("/")
async def empty_route() -> RedirectResponse:
    return RedirectResponse(url="/login")


def _load_manifest() -> tuple[str, str | None]:
    manifest_path = BASE_DIR / "static" / "dist" / ".vite" / "manifest.json"
    with manifest_path.open() as f:
        manifest = json.load(f)
    js_file = manifest["index.html"]["file"]
    css_file = manifest["index.html"].get("css", [None])[0]
    return js_file, css_file


@router.get("/{path:path}", response_class=HTMLResponse)
async def spa_routes(path: str, request: Request) -> HTMLResponse:
    if path.startswith("api/"):
        return HTMLResponse("Not found", status_code=404)
    js_file, css_file = _load_manifest()
    return templates.TemplateResponse(
        "index.html", {"request": request, "js_file": js_file, "css_file": css_file}
    )


@router.get("/login", response_class=HTMLResponse)
@router.get("/mapa", response_class=HTMLResponse)
@router.get("/parcelas", response_class=HTMLResponse)
@router.get("/campos", response_class=HTMLResponse)
@router.get("/alertas", response_class=HTMLResponse)
@router.get("/animales", response_class=HTMLResponse)
async def render_react_app(request: Request) -> HTMLResponse:
    js_file, css_file = _load_manifest()
    return templates.TemplateResponse(
        "index.html", {"request": request, "js_file": js_file, "css_file": css_file}
    )
