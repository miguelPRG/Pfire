#!/bin/bash

# Verifica se a pasta venv existe
if [ -d "venv" ]; then
    echo "Ativando ambiente virtual existente..."
else
    echo "Criando novo ambiente virtual..."
    python3 -m venv venv
fi

# Ativar o ambiente virtual
source venv/bin/activate

# Atualizar pip
pip install --upgrade pip

# Instalar as dependências e remover pacotes não listados em requirements.txt, exceto pip
pip install --no-deps -r requirements.txt

# Iniciar o servidor Uvicorn
uvicorn main:app --reload
