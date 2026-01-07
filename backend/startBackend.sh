#!/usr/bin/env -S bash -Eeuo pipefail

# Config
VENV_DIR=".venv"
export PATH="$HOME/.local/bin:$PATH"   # donde 'uv' suele instalarse

# 1) Instalar uv si no existe
if ! command -v uv >/dev/null 2>&1; then
  echo "Instalando uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi

# 2) Crear venv si no existe
if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creando entorno virtual..."
  uv venv "$VENV_DIR"
fi

# 3) Activar venv e instalar dependencias
echo "Activando venv e instalando dependencias..."
source "$VENV_DIR/bin/activate"
if [[ -f "pyproject.toml" ]]; then
  uv sync
fi

# 4) Arrancar servidor (un único uvicorn)
echo "Arrancando servidor..."
exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
