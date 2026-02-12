FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt

# Augmenter le timeout à 300 secondes (5 minutes) et réessayer 5 fois
RUN pip install --no-cache-dir \
    --default-timeout=300 \
    --retries 5 \
    -r requirements.txt

COPY . /app

EXPOSE 8000