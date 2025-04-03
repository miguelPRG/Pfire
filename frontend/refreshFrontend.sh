#!/bin/bash

# Verifica se a pasta node_modules existe
if [ -d "node_modules" ]; then
    # Remover pacotes não listados em package.json
    npm prune
else
    echo "Instalando dependências do projeto..."
    npm install
fi

# Iniciar a aplicação Node.js
npm run dev
