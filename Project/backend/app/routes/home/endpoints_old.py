# ~/backend.app /backend/src/Routes/home/routes.py
from flask import Blueprint, render_template, current_app, redirect
from backend.app.security import admin_required
import json
import os

home = Blueprint("home", __name__)


@home.route("/")
def empty_route():
    return redirect("/login")

def _render_spa():
    """Helper to render the React application using the Vite manifest."""
    manifest_path = os.path.join(
        current_app.root_path,
        "static",
        "dist",
        ".vite",
        "manifest.json",
    )
    with open(manifest_path) as f:
        manifest = json.load(f)
        js_file = manifest["index.html"]["file"]
        css_file = manifest["index.html"].get("css", [None])[0]
    return render_template("index.html", js_file=js_file, css_file=css_file)

@home.route("/<path:path>", methods=["GET"])
def spa_routes(path):
    if path.startswith("api/"):
        return "Not found", 404
    return _render_spa()


@home.route("/home", methods=["GET", "POST"])
@admin_required
def home_route():
    return render_template("base/home.html")