FROM python:3.12-slim

WORKDIR /app

# Install runtime deps
RUN pip install --no-cache-dir flask

COPY . .

EXPOSE 7002

CMD ["python", "app.py"]

