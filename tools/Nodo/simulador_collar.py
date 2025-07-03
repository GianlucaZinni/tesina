import ssl
import time
import json
import random
import logging
import threading
import paho.mqtt.client as mqtt
from datetime import datetime

# =============================
# CONFIGURACIÓN GENERAL
# =============================
BROKER = "localhost"
PORT = 8883
TOPIC = "ganado/sensor"

CA_CERT = "F:/TESINA/mqtt_certs/ca.crt"
CLIENT_CERT = "F:/TESINA/mqtt_certs/client.crt"
CLIENT_KEY = "F:/TESINA/mqtt_certs/client.key"

NODOS_SIMULADOS = 11  # Puedes ajustar esta variable para simular más nodos
INTERVALO_SEGUNDOS = 60

# =============================
# LOGGING GLOBAL
# =============================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(threadName)s %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("simulador_multi.log"),
        logging.StreamHandler()
    ]
)

# =============================
# FUNCIONES AUXILIARES
# =============================
def generar_payload(client_id):
    return {
        "client_id": client_id,
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
# FUNCIÓN POR THREAD
# =============================
def run_simulador(client_id):
    client = mqtt.Client(client_id=client_id)
    client.tls_set(
        ca_certs=CA_CERT,
        certfile=CLIENT_CERT,
        keyfile=CLIENT_KEY,
        tls_version=ssl.PROTOCOL_TLSv1_2
    )
    client.tls_insecure_set(False)

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            logging.info(f"[{client_id}] Conectado exitosamente al broker MQTT")
        else:
            logging.error(f"[{client_id}] Fallo en la conexión MQTT. Código: {rc}")

    client.on_connect = on_connect

    try:
        client.connect(BROKER, PORT, keepalive=60)
        client.loop_start()

        while True:
            payload = generar_payload(client_id)
            message = json.dumps(payload)
            client.publish(TOPIC, message)
            logging.info(f"[{client_id}] Publicado: {message}")
            time.sleep(INTERVALO_SEGUNDOS)

    except Exception as e:
        logging.exception(f"[{client_id}] Error en el simulador: {e}")
    finally:
        client.loop_stop()
        client.disconnect()

# =============================
# INICIO DE TODOS LOS THREADS
# =============================
if __name__ == "__main__":
    threads = []

    for i in range(1, NODOS_SIMULADOS + 1):
        client_id = f"nodo-test-{i:03d}"
        t = threading.Thread(target=run_simulador, args=(client_id,), name=f"Simulador-{client_id}")
        t.start()
        threads.append(t)

    # Opcional: Esperar que terminen (aunque corren infinito)
    for t in threads:
        t.join()
