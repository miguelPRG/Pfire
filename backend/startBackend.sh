#!/usr/bin/env -S bash -Eeuo pipefail

# Config
VENV_DIR=".venv"
export PATH="$HOME/.local/bin:$PATH"   # onde 'uv' costuma ser instalado

# 1) Instalar uv se não existir
if ! command -v uv >/dev/null 2>&1; then
  echo "Instalando uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi

# 2) Detectar versão de Python (>= 3.12) e verificar instalação
PYTHON_CMD=""
for cmd in python3.14 python3.13 python3.12 python3 python; do
  if command -v "$cmd" >/dev/null 2>&1; then
    # Obter versão usando --version
    version=$("$cmd" --version 2>&1 | grep -oP '(?<=Python )\d+\.\d+' || echo "0.0")
    
    # Verificar se consegue importar módulos básicos (valida instalação apt)
    if ! "$cmd" -c 'import venv, ensurepip' >/dev/null 2>&1; then
      echo "Aviso: $cmd (v$version) não tem módulos venv/ensurepip. Ignorando..."
      continue
    fi
    
    if awk -v ver="$version" 'BEGIN {exit !(ver >= 3.12)}'; then
      PYTHON_CMD="$cmd"
      echo "Python $version encontrado e validado: $cmd"
      break
    fi
  fi
done

if [[ -z "$PYTHON_CMD" ]]; then
  echo "Erro: É necessário Python >= 3.12 com venv instalado"
  echo "No Ubuntu/Debian, instale com: sudo apt install python3.12 python3.12-venv"
  exit 1
fi

# 3) Criar venv se não existir
if [[ ! -d "$VENV_DIR" ]]; then
  echo "Criando ambiente virtual..."
  uv venv "$VENV_DIR" --python "$PYTHON_CMD"
fi

# 4) Ativar venv e instalar dependências
echo "Ativando venv e instalando dependências..."
source "$VENV_DIR/bin/activate"
if [[ -f "pyproject.toml" ]]; then
  uv sync
fi

# 5) Arrancar servidor (um único uvicorn)
echo "Arrancando servidor..."
exec fastapi dev main.py
