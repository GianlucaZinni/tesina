import json
import requests
from datetime import datetime

API_ENDPOINT = "http://localhost:5000/api/datos"
CLIENT_ID = "nodo-test-001"

payload = {
    "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
    "lat": -34.559,  # Ubicación simulada
    "lon": -58.489,
    "temperatura": 38.4,
    "temperatura_ambiente": 27.8,
    "acelerometro": {
        "x": 0.01,
        "y": -0.02,
        "z": 9.81
    }
}

headers = {
    "Content-Type": "application/json",
    "X-Client-ID": CLIENT_ID
}

response = requests.post(API_ENDPOINT, data=json.dumps(payload), headers=headers)

print(f"Status: {response.status_code}")
print(response.json())