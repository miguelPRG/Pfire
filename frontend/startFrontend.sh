#!/bin/bash

# Remover pacotes não listados em package.json
echo "Removendo pacotes não listados em package.json..."
npm prune

# Instalar dependências do projeto
echo "Instalando dependências do projeto..."
npm install

# Iniciar a aplicação Node.js
echo "Iniciando a aplicação Node.js..."
npm run dev
