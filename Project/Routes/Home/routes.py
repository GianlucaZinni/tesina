from flask import url_for, redirect, render_template, Blueprint
from Project.access import admin_required

from flask import url_for, redirect, Blueprint
Home = Blueprint('Home', __name__)

@Home.route('/')
def empty_route():
    return redirect(url_for("Users.login"))

@Home.route('/home', methods=['GET', 'POST'])
@admin_required
def home():
    return render_template('base/home.html')

@Home.route('/index')
@admin_required
def index():
    PAGE_TITLE = "Buenos Aires Live Map"

    MAP_URL_TEMPLATE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    MAP_STARTING_CENTER = [-35.269560, -60.802627]  # 📌 Centro del área de pastoreo
    MAP_STARTING_ZOOM = 15  # 📌 Zoom más cercano para ver mejor la zona
    MAP_MAX_ZOOM = 18

    KAFKA_TOPIC = "geodata_stream_topic_ba"

    return render_template(
        "base/index.html",
        PAGE_TITLE=PAGE_TITLE,
        MAP_URL_TEMPLATE=MAP_URL_TEMPLATE,
        MAP_ATTRIBUTION=MAP_ATTRIBUTION,
        MAP_STARTING_CENTER=MAP_STARTING_CENTER,
        MAP_STARTING_ZOOM=MAP_STARTING_ZOOM,
        MAP_MAX_ZOOM=MAP_MAX_ZOOM,
        KAFKA_TOPIC=KAFKA_TOPIC,
    )