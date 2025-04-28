import ssl
import time
import json
import random
import logging
import paho.mqtt.client as mqtt
from datetime import datetime

# =============================
# CONFIGURACIÓN
# =============================
BROKER = "localhost"
PORT = 8883
TOPIC = "ganado/sensor"

# Identidad del nodo
CLIENT_ID = "nodo-test-001"

# Certificados
CA_CERT = "F:/TESINA/mqtt_certs/ca.crt"
CLIENT_CERT = "F:/TESINA/mqtt_certs/client.crt"
CLIENT_KEY = "F:/TESINA/mqtt_certs/client.key"

# =============================
# LOGGING
# =============================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("nodo.log"),
        logging.StreamHandler()
    ]
)

# =============================
# CALLBACKS
# =============================
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info("Conectado al broker MQTT con éxito")
    else:
        logging.error(f"Error de conexión: {rc}")

# =============================
# SIMULADOR DE DATOS
# =============================
def generar_payload():
    return {
        "client_id": CLIENT_ID,
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "lat": round(-35.500422 + random.uniform(-0.0005, 0.0005), 6),
        "lon": round(-60.348737 + random.uniform(-0.0005, 0.0005), 6),
        "temperatura": round(random.uniform(37.0, 39.5), 2),
        "temperatura_ambiente": round(random.uniform(25.0, 30.0), 2),
        "acelerometro": {
            "x": round(random.uniform(-1.0, 1.0), 2),
            "y": round(random.uniform(-1.0, 1.0), 2),
            "z": round(random.uniform(9.5, 10.5), 2)
        }
    }

# =============================
# CLIENTE MQTT
# =============================
client = mqtt.Client(client_id=CLIENT_ID)
client.tls_set(
    ca_certs=CA_CERT,
    certfile=CLIENT_CERT,
    keyfile=CLIENT_KEY,
    tls_version=ssl.PROTOCOL_TLSv1_2
)
client.tls_insecure_set(False)
client.on_connect = on_connect

# =============================
# LOOP PRINCIPAL
# =============================
try:
    client.connect(BROKER, PORT, keepalive=60)
    client.loop_start()

    logging.info("Nodo iniciado. Enviando datos...")

    while True:
        payload = generar_payload()
        message = json.dumps(payload)
        client.publish(TOPIC, message)
        logging.info(f"Publicado en '{TOPIC}': {message}")
        time.sleep(1)  # enviar cada 10 segundos

except Exception as e:
    logging.exception(f"Error en nodo: {e}")

finally:
    client.loop_stop()
    client.disconnect()
