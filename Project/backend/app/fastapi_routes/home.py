from fastapi import APIRouter
from fastapi.responses import HTMLResponse, RedirectResponse
import json
import os

from backend.app import create_app

# We use the underlying Flask app for template rendering
flask_app = create_app()

router = APIRouter()


def _render_spa() -> HTMLResponse:
    manifest_path = os.path.join(
        flask_app.root_path,
        "static",
        "dist",
        ".vite",
        "manifest.json",
    )
    with open(manifest_path) as f:
        manifest = json.load(f)
    js_file = manifest["index.html"]["file"]
    css_file = manifest["index.html"].get("css", [None])[0]
    with flask_app.app_context():
        html = flask_app.jinja_env.get_template("index.html").render(
            js_file=js_file, css_file=css_file
        )
    return HTMLResponse(html)


@router.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse(url="/login")


@router.get("/{path:path}")
async def spa_routes(path: str):
    if path.startswith("api/"):
        return HTMLResponse("Not found", status_code=404)
    return _render_spa()