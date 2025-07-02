# ~/Project/backend/src/Routes/home/routes.py
from flask import Blueprint, render_template, current_app, redirect
from Project.access import admin_required
import json

home = Blueprint("home", __name__)


@home.route("/")
def empty_route():
    return redirect("/login")

@home.route("/<path:path>", methods=["GET"])
def spa_routes(path):
    if path.startswith("api/"):
        return "Not found", 404

    manifest_path = current_app.root_path + "/static/dist/.vite/manifest.json"
    with open(manifest_path) as f:
        manifest = json.load(f)
        js_file = manifest["index.html"]["file"]
        css_file = manifest["index.html"].get("css", [None])[0]
    return render_template("index.html", js_file=js_file, css_file=css_file)

@home.route("/mapa")
def default():
    # Ruta absoluta del manifest generado por Vite
    manifest_path = current_app.root_path + "\static\dist\.vite\manifest.json"

    with open(manifest_path) as f:
        manifest = json.load(f)
        # accedemos a los archivos principales
        js_file = manifest["index.html"]["file"]
        css_file = manifest["index.html"].get("css", [None])[0]  # puede no tener

    return render_template("index.html", js_file=js_file, css_file=css_file)


@home.route("/login")
@home.route("/mapa")
@home.route("/parcelas")
@home.route("/campos")
@home.route("/collares")
@home.route("/alertas")
@home.route("/animales")
def render_react_app():
    # Ruta absoluta del manifest generado por Vite
    manifest_path = current_app.root_path + "\static\dist\.vite\manifest.json"

    with open(manifest_path) as f:
        manifest = json.load(f)
        # accedemos a los archivos principales
        js_file = manifest["index.html"]["file"]
        css_file = manifest["index.html"].get("css", [None])[0]  # puede no tener

    return render_template("index.html", js_file=js_file, css_file=css_file)


@home.route("/home", methods=["GET", "POST"])
@admin_required
def home_route():
    return render_template("base/home.html")
