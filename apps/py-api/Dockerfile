FROM python:3.12-slim

WORKDIR /app

# Install runtime deps
RUN pip install --no-cache-dir flask gunicorn

COPY . .

EXPOSE 7002

CMD ["gunicorn", "-b", "0.0.0.0:7002", "app:app"]

