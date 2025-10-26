#!/usr/bin/env bash
set -e

# Caminhos
UV_HOME="$HOME/snap/code/210/.local/bin"
VENV_DIR=".venv"

# 1️⃣ Instalar UV se não existir
if ! command -v uv &> /dev/null; then
    echo "UV não encontrado. Instalando..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    sudo mv "$UV_HOME/uv" /usr/local/bin/uv
    sudo mv "$UV_HOME/uvx" /usr/local/bin/uvx
else
    echo "UV já instalado."
fi

# 2️⃣ Criar ambiente virtual se não existir
if [ ! -d "$VENV_DIR" ]; then
    echo "Criando ambiente virtual..."
    uv venv
fi

# 3️⃣ Ativar ambiente virtual e instalar dependências
echo "Ativando ambiente virtual e instalando dependências..."
source "$VENV_DIR/bin/activate"
uv pip install -r pyproject.toml



# 4️⃣ Arrancar servidor Uvicorn
echo "Arrancando servidor..."
uvicorn main:app --reload
