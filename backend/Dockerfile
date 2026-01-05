#Use a menor imagem possível baseada no Python 3.13
FROM python:3.12-slim

#Evita o uso de buffer para saída no terminal
ENV PYTHONUNBUFFERED=1

#Atualiza pacotes base e instala dependências do sistema
RUN apt-get update \
&& apt-get full-upgrade -y \
&& apt-get install -y --no-install-recommends \
    libpq5 \
    libgobject-2.0-0 \
    libglib2.0-0 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
&& apt-get clean \
&& apt-get autoremove -y \
&& rm -rf /var/lib/apt/lists/*

#Define o diretório de trabalho no container
WORKDIR /app

#Copia apenas os arquivos de dependências primeiro (para aproveitar cache)
COPY pyproject.toml uv.lock* ./

#Atualiza pip, instala uv, sincroniza dependências travadas (frozen)
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir uv && \
    uv sync --frozen

#Copia o restante do código da aplicação para o container
COPY . .

#Cria usuário não root
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

#Exponha a porta em que o app será executado
EXPOSE 10000

#Command to run the app with Uvicorn
CMD ["sh","-c","uv run uvicorn main:app --host 0.0.0.0 --port 10000"]