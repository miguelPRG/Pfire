# Etapa 1: Build com Node.js
FROM node:22.13-alpine AS builder
    
WORKDIR /app

# Copiar apenas os arquivos essenciais
COPY package*.json ./
RUN npm install --omit=dev
    
# Copiar o restante do projeto
COPY . .
    
# Construir o projeto
RUN npm run build
    
# Etapa 2: Servir com Nginx
FROM nginx:1.26.3-alpine
    
# Variáveis de ambiente
ENV NODE_ENV production
    
# Copiar arquivos construídos para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
    
# Copiar configuração customizada do Nginx
COPY /nginx/nginx.conf /etc/nginx/conf.d/default.conf
    
# Configurar healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80 || exit 1
    
# Expor a porta usada pelo Nginx
EXPOSE 80
    
# Iniciar o servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
    