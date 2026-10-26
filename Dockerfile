# Optie B: Python-server (FastAPI) + frontend in één container. Werkt op Render, Railway, Fly.io…
# Lokaal: docker build -t zontraject . && docker run -p 8000:8000 zontraject

# 1. Frontend bouwen (Tailwind, Leaflet, fonts)
FROM node:22-slim AS web
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm test && npm run build

# 2. Python-server
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY src/ ./src/
RUN uv sync --frozen --no-dev
COPY --from=web /app/web/static ./web/static

ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uv run --no-sync uvicorn zontraject.main:app --host 0.0.0.0 --port ${PORT}"]
