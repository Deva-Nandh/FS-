# syntax=docker/dockerfile:1

FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY . .
RUN go build -o /out/go-api

FROM alpine:3.20
RUN apk add --no-cache ca-certificates && adduser -D -H app && mkdir -p /app
COPY --from=builder /out/go-api /app/go-api
USER app
EXPOSE 7001
ENTRYPOINT ["/app/go-api"]

