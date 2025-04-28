from flask import Blueprint, current_app, send_from_directory
import os

static_files = Blueprint('static_files', __name__)

@static_files.route('/dist/<path:filename>')
def serve_dist_file(filename):
    return send_from_directory(os.path.join(current_app.root_path, 'static', 'dist'), filename)
