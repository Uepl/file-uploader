# --- STAGE 1: Deps ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Use ci for faster, more reliable installs
RUN npm ci

# --- STAGE 2: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=768"
RUN npm run build:client && npm run build:server

# --- STAGE 3: Production API ---
FROM node:22-alpine AS server
WORKDIR /app
ENV NODE_ENV=production

# 1. Copy package files first for better layer caching
COPY --from=builder /app/package*.json ./

# 2. Install production dependencies (cached unless package.json changes)
RUN npm ci --omit=dev && npm cache clean --force

# 3. Copy only the server build
COPY --from=builder /app/dist/server ./dist/server

EXPOSE 3000
CMD ["node", "dist/server/server.js"]

# --- STAGE 4: Static Site ---
FROM nginx:stable-alpine AS static-site
# Strip default config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist/client /usr/share/nginx/html
EXPOSE 80 443