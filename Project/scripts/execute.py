import subprocess
import os

# Asegurate de que esta ruta sea absoluta y esté bien formateada
python_exe = "python"  # o el path completo, por ejemplo: "C:\\Python39\\python.exe"

scripts = [
    "F:\\TESINA\\PROYECTO\\tesina\\Mqtt\\mqtt_gateway_server.py",
    "F:\\TESINA\\PROYECTO\\tesina\\Nodo\\simulador_collar.py",
    "F:\\TESINA\\PROYECTO\\tesina\\run.py"
]

for script in scripts:
    subprocess.Popen(
        f'start cmd /k "{python_exe} \"{script}\""',
        shell=True
    )
