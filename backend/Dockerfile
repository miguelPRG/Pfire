# Usa a menor imagem possível baseada no Python 3.14-slim
FROM python:3.14-slim

ENV PYTHONUNBUFFERED=1

# Atualiza pacotes base e instala dependências do sistema
RUN apt-get update \
    && apt-get full-upgrade -y \
    && apt-get install -y --no-install-recommends libgobject-2.0-0 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    && apt-get clean \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia dependências primeiro
COPY pyproject.toml uv.lock* ./

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir uv \
    && uv sync --frozen

# Copia o restante do código
COPY . .

# Cria usuário não-root e ajusta permissões
RUN useradd -m appuser && chown -R appuser:appuser /app 

USER appuser

EXPOSE 10000

CMD ["sh","-c","uv run uvicorn main:app --host 0.0.0.0 --port 10000"]
