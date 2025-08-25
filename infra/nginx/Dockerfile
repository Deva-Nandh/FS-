FROM nginx:1.27-alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Ensure log directory exists and permissions are OK
RUN mkdir -p /var/log/nginx && \
    touch /var/log/nginx/access.log /var/log/nginx/error.log

EXPOSE 9090

CMD ["nginx", "-g", "daemon off;"]

