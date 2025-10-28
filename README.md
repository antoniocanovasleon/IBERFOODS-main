# IBERFOODS – Guía de despliegue y operación

Este proyecto combina un backend en FastAPI (`backend/`) y un frontend en React (`frontend/`). A continuación se describen los pasos para configurarlo localmente, ejecutar las pruebas y publicarlo en **emergent.sh**.

## 1. Requisitos previos

- Python 3.11+ y `pip`
- Node.js 18+ y `yarn` (o `npm`)
- Cuenta y proyecto configurado en [Supabase](https://supabase.com)
- Acceso a emergent.sh con permisos para desplegar

## 2. Configuración de variables de entorno

Se proporcionan plantillas de variables en `backend/.env.example` y `frontend/.env.example`. Cópialas y completa los valores:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Variables clave del backend (`backend/.env`):

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL de tu instancia Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key de Supabase |
| `JWT_SECRET_KEY` | Clave secreta para firmar JWT (cámbiala en producción) |
| `CORS_ORIGINS` | Lista separada por comas con los orígenes permitidos |
| `BACKEND_TEST_REPORT_DIR` *(opcional)* | Carpeta donde guardar resultados de tests |

Variables del frontend (`frontend/.env`):

| Variable | Descripción |
|----------|-------------|
| `REACT_APP_BACKEND_URL` | URL pública del backend FastAPI |

> **Nota:** No subas tus `.env` reales al repositorio. Usa los archivos `.env.example` para compartir la configuración esperada.

## 3. Ejecución local

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
yarn install
yarn start
```

El frontend asumirá que el backend está accesible en `REACT_APP_BACKEND_URL` (por defecto `http://localhost:8000`).

## 4. Pruebas automatizadas

El archivo `backend_test.py` contiene una batería de pruebas end-to-end contra el backend desplegado. Para ejecutarlas:

```bash
set BACKEND_BASE_URL=http://localhost:8000/api  # PowerShell: $env:BACKEND_BASE_URL = "http://localhost:8000/api"
python backend_test.py
```

Los resultados se almacenan en `test_reports/backend_test_results.json` (puedes redefinir la ruta con `BACKEND_TEST_REPORT_DIR`).

## 5. Despliegue en emergent.sh

1. **Backend**
   - Sube la imagen o repositorio asegurándote de instalar dependencias (`pip install -r requirements.txt`).
   - Define el comando de arranque, por ejemplo `uvicorn server:app --host 0.0.0.0 --port 8000`.
   - Configura las variables de entorno anteriores en el panel de emergent.
   - **Docker**: puedes construir la imagen incluida (`backend/Dockerfile`). Ejemplo:
     ```bash
     docker build -t iberfoods-backend ./backend
     docker run -p 8000:8000 --env-file backend/.env iberfoods-backend
     ```

2. **Frontend**
   - Ejecuta `yarn build` para generar la carpeta `build/`.
   - Despliega la carpeta estática en emergent (o usa el adaptador estático que prefieras) configurando `REACT_APP_BACKEND_URL` con el dominio del backend publicado.

3. **Verificación**
   - Actualiza `BACKEND_BASE_URL` para apuntar al entorno publicado y ejecuta `python backend_test.py`.
   - Recorre la aplicación manualmente (auth, calendario, kanban, gestión de usuarios) para validar flujos principales.

4. **Dominio personalizado (opcional)**
   - Configura los registros DNS desde tu proveedor hacia la URL provista por emergent.
   - Habilita HTTPS desde el panel de emergent.

## 6. Mantenimiento

- Mantén los archivos `.env.example` al día cuando se agreguen nuevas variables.
- Actualiza `requirements.txt` y `package.json` tras cambios de dependencias.
- Documenta en este README cualquier proceso manual adicional (migraciones, scripts, etc.).

---

Para dudas o mejoras, añade incidencias en el repositorio o amplía esta guía con pasos específicos de tu organización.
