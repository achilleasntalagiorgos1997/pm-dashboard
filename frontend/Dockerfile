# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Serve static
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# ensure SPA fallback
RUN sed -i 's/try_files.*/try_files $uri $uri\/ \/index.html;/' /etc/nginx/conf.d/default.conf
