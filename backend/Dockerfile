FROM python:3.12-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-dev.txt /app/

# Image de développement (docker-compose) : dépendances de l'application ET des tests (pytest, factory-boy), pour que
# la suite tourne sans échec d'environnement, comme dans la CI. La production utilise Dockerfile.prod, sans eux.
# Augmenter le timeout à 300 secondes (5 minutes) et réessayer 5 fois
RUN pip install --no-cache-dir \
    --default-timeout=300 \
    --retries 5 \
    -r requirements-dev.txt

COPY . /app

EXPOSE 8000
