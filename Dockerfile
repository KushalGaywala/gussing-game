# Gujarati Imposter PWA — static site served by nginx.
# Single-stage: there is no build step (vanilla HTML/CSS/JS).
# Coolify auto-detects this Dockerfile and exposes port 8080.
FROM nginx:1.27-alpine

# Serve config (correct MIME types, Digital Asset Links, PWA cache rules).
COPY nginx.conf /etc/nginx/nginx.conf

# App shell. .dockerignore keeps deploy/tooling files out of the image.
COPY . /usr/share/nginx/html

# Do not ship the container's own build/config files into the web root.
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/.dockerignore \
          /usr/share/nginx/html/nginx.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
