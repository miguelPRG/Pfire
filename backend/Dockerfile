FROM python:3.14-slim

# Forçar logs em tempo real
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get full-upgrade -y \
    && apt-get install -y --no-install-recommends libgobject-2.0-0 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml uv.lock* ./

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir uv \
    && uv pip install --system .

COPY . .

ENV LOG_DIR=/var/log/pfire

RUN useradd -m -u 10000 appuser \
    && mkdir -p ${LOG_DIR} \
    && chown -R appuser:appuser /app/ ${LOG_DIR} \
    && chmod 755 ${LOG_DIR}

USER appuser

EXPOSE 10000

CMD ["uv", "run", "fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "10000"]