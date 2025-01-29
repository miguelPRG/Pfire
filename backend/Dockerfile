# Use a menor imagem possível baseada no Python 3.13
FROM python:3.13-slim

# Evita o uso de buffer para saída no terminal
ENV PYTHONUNBUFFERED 1

# Atualiza pacotes base e instala dependências do sistema
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    build-essential libpq-dev gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho no container
WORKDIR /app

# Copia apenas o arquivo de requisitos primeiro
COPY requirements.txt .

# Instala dependências e remove cache do pip
RUN pip install --no-cache-dir -r requirements.txt && rm -rf /root/.cache/pip

# Cria usuário não root
RUN useradd -m appuser
USER appuser

# Copia o restante do código da aplicação para o container
COPY . .

# Exponha a porta em que o app será executado
EXPOSE 8000

# Command to run the app with Uvicorn. Adiciona workres conforme o número de cores de CPU
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
