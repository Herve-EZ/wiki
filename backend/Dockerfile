FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev xmlsec1 libxml2-dev libxmlsec1-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
# [saml] extra: xmlsec native libs are available in this image (Linux)
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir ".[saml]"

COPY . .

EXPOSE 8000
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
