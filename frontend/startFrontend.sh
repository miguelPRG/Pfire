#!/bin/bash

set -e  # Interrompe o script em caso de erro

# Instalar dependências do projeto
echo "Instalando dependências do projeto..."
if ! npm install; then
    echo "Erro ao instalar dependências. Verifique o arquivo package.json."
    exit 1
fi

# Remover pacotes não listados em package.json
echo "Removendo pacotes não listados em package.json..."
if ! npm prune; then
    echo "Erro ao remover pacotes não listados. Verifique sua configuração do npm."
    exit 1
fi

# Iniciar a aplicação Node.js
echo "Iniciando a aplicação Node.js..."
if ! npm run dev; then
    echo "Erro ao iniciar a aplicação. Verifique os scripts no package.json."
    exit 1
fi