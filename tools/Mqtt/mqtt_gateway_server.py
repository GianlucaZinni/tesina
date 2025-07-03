import ssl
import json
import time
import logging
import requests
import paho.mqtt.client as mqtt

# =============================
# CONFIGURACIÓN
# =============================
BROKER = "localhost"
PORT = 8883
TOPIC = "ganado/sensor"

# Ruta a certificados
CA_CERT = "F:/TESINA/mqtt_certs/ca.crt"
CLIENT_CERT = "F:/TESINA/mqtt_certs/client.crt"
CLIENT_KEY = "F:/TESINA/mqtt_certs/client.key"

# Endpoint simulado (ajustar a tu API real más adelante)
API_ENDPOINT = "http://localhost:5000/api/datos"


# =============================
# LOGGING
# =============================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("gateway.log"),
        logging.StreamHandler()
    ]
)

# =============================
# FUNCIONES DE PROCESAMIENTO
# =============================
def procesar_y_enviar(payload: str):
    try:
        data = json.loads(payload)
        logging.info(f"Mensaje procesado: {data}")

        client_id = data.get("client_id")
        if not client_id:
            logging.warning("Mensaje recibido sin client_id, descartado")
            return

        headers = {
            "X-Client-ID": client_id,
            "Content-Type": "application/json"
        }

        response = requests.post(API_ENDPOINT, json=data, headers=headers, timeout=5)

        if response.status_code == 200:
            logging.info(f"Datos de '{client_id}' enviados correctamente a la API")
        else:
            logging.warning(f"Fallo en la API: {response.status_code} - {response.text}")

    except json.JSONDecodeError:
        logging.error("Error al decodificar JSON")
    except requests.exceptions.RequestException as e:
        logging.error(f"Error de red al enviar a API: {e}")


# =============================
# CALLBACKS MQTT
# =============================
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info("Conexión exitosa al broker MQTT")
        client.subscribe(TOPIC)
    else:
        logging.error(f"Fallo de conexión: código {rc}")

def on_message(client, userdata, msg):
    payload = msg.payload.decode("utf-8")
    logging.info(f"Mensaje recibido en '{msg.topic}': {payload}")
    procesar_y_enviar(payload)

# =============================
# CONFIGURAR CLIENTE MQTT
# =============================
client = mqtt.Client()
client.tls_set(
    ca_certs=CA_CERT,
    certfile=CLIENT_CERT,
    keyfile=CLIENT_KEY,
    tls_version=ssl.PROTOCOL_TLSv1_2
)
client.tls_insecure_set(False)

client.on_connect = on_connect
client.on_message = on_message

# =============================
# INICIAR CONEXIÓN
# =============================
try:
    client.connect(BROKER, PORT, keepalive=60)
    logging.info("Esperando mensajes... (Ctrl+C para salir)")
    client.loop_forever()
except Exception as e:
    logging.exception(f"Error de conexión con el broker: {e}")
