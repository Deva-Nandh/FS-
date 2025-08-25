FROM python:3.12-slim

WORKDIR /app

# Install tools for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install runtime deps
RUN pip install --no-cache-dir flask gunicorn

COPY . .

EXPOSE 7002

CMD ["gunicorn", "-b", "0.0.0.0:7002", "app:app"]

