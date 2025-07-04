from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

BASE_DIR = Path(__file__).resolve().parents[4]
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
templates.env.globals["get_flashed_messages"] = lambda *args, **kwargs: []

def register_error_handlers(app: FastAPI) -> None:
    """Register custom HTML error pages."""

    @app.exception_handler(404)
    async def not_found(request: Request, exc):
        return templates.TemplateResponse(
            "errors/404.html", {"request": request}, status_code=404
        )

    @app.exception_handler(403)
    async def forbidden(request: Request, exc):
        return templates.TemplateResponse(
            "errors/403.html", {"request": request}, status_code=403
        )

    @app.exception_handler(401)
    async def unauthorized(request: Request, exc):
        return templates.TemplateResponse(
            "errors/401.html", {"request": request}, status_code=401
        )

    @app.exception_handler(500)
    async def server_error(request: Request, exc):
        return templates.TemplateResponse(
            "errors/500.html", {"request": request}, status_code=500
        )

    @app.exception_handler(501)
    async def code_expired(request: Request, exc):
        return templates.TemplateResponse(
            "errors/501.html", {"request": request}, status_code=501
        )


__all__ = ["register_error_handlers"]