# dpdzero-revamp

A fresh microservices setup with an Nginx gateway and two backend services.

- Gateway: Nginx on :9090
- Go API (alpha): :7001
- Python API (beta): :7002

Routes via gateway:
- /alpha/* -> go_api
- /beta/*  -> py_api

Quick start

1) Start Docker Desktop
2) From this folder, run:

```
docker-compose -f compose.yaml up --build
```

Then test:
- curl http://localhost:9090/alpha/ping
- curl http://localhost:9090/alpha/hello
- curl http://localhost:9090/beta/ping
- curl http://localhost:9090/beta/hello
- curl http://localhost:9090/nginx-health

