# frontend/Dockerfile
FROM node:20-alpine
WORKDIR /app

# Install deps (use npm install as requested)
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Build the app
COPY . .
RUN npm run build

# Serve the built SPA on 0.0.0.0:3000
RUN npm i -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]
