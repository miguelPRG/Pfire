
# Etapa 1: Build da imagem com o Node.js
FROM node:22.13-alpine AS builder

WORKDIR /app

# Copiar arquivos do projeto para o container
COPY package*.json ./
RUN npm install
RUN apk add --no-cache curl
COPY . .

# Construir o projeto
RUN npm run build

# Etapa 2: Servir com nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx, se necessário
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor a porta usada pelo nginx
EXPOSE 80

# Iniciar o servidor nginx
CMD ["nginx", "-g", "daemon off;"]