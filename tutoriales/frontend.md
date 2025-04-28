⚙️ 1. Instalar Node.js (si no lo tenés)
🔗 Descargar Node.js LTS:
➡️ https://nodejs.org

Bajá la versión LTS recomendada (actualmente v20.x o superior).
Instálalo con las opciones por defecto.
Reiniciá la terminal al terminar.

✅ Verificar instalación:
node -v
npm -v
Debe devolver algo como:
v20.11.1
10.2.4

🧱 2. Crear carpeta frontend/ y generar proyecto con Vite
Ubicate en la raíz de tu proyecto Flask (Project/) y ejecutá:
cd Project
npm create vite@latest frontend
npm install @vitejs/plugin-react

Elegí:
Project name: frontend (o el que prefieras)

Framework: React
Variant: JavaScript + SWC

📦 3. Instalar dependencias necesarias
Entrá al nuevo proyecto:
cd frontend
Y ejecutá:
npm install

🧵 4. Instalar y configurar Tailwind CSS
Instalar Tailwind, PostCSS y Autoprefixer:
npm install -D tailwindcss@^3.3.5 postcss autoprefixer

Crear archivos de configuración:
npx tailwindcss init -p

✅ Esto genera:
tailwind.config.js
postcss.config.js
Configurar Tailwind
🧾 tailwind.config.js

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
Crear archivo de estilos y activarlo
🧾 src/index.css

@tailwind base;
@tailwind components;
@tailwind utilities;

🧾 src/main.jsx

Agregá:
import './index.css';

🗺 5. Instalar Leaflet + React Leaflet

npm install leaflet react-leaflet

Y agregá en App.jsx:
import 'leaflet/dist/leaflet.css';

🛠 6. Configurar Vite para compilar dentro de Flask
Editá vite.config.js así:

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../static/dist'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: './index.html',
    },
  },
})

🧪 7. Probar en modo desarrollo
npm run dev
Abre: http://localhost:5173

🧱 8. Compilar frontend para producción (Flask)
Cuando quieras integrar con Flask:

npm run build
Esto genera los archivos en:

Project/static/dist/
Y Flask puede servirlos desde allí.

🧩 9. Usar desde Flask
En routes.py:

from flask import Blueprint, render_template

home = Blueprint("home", __name__)

@home.route("/")
def index():
    return render_template("index.html")

Y en templates/index.html:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Ganadería 4.0</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script type="module" crossorigin src="{{ url_for('static', filename='dist/assets/index.js') }}"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
