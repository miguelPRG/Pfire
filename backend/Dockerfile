FROM python:3.14-slim

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
    && uv sync --frozen

COPY . .

RUN useradd -m appuser \
    && chown -R appuser:appuser /app/

USER appuser

EXPOSE 10000

CMD ["sh", "-c", "uv run uvicorn main:app --host 0.0.0.0 --port 10000"]
