# --- STAGE 1: Deps ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/auth-service/package*.json ./services/auth-service/
COPY services/file-service/package*.json ./services/file-service/
COPY services/worker/package*.json ./services/worker/
COPY services/gateway/package*.json ./services/gateway/
RUN npm ci

# --- STAGE 2: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=768"
RUN npm run build:services
RUN npm run build:client

# --- STAGE 3: Base Runner ---
FROM node:22-alpine AS runner-base
RUN apk add --no-cache netcat-openbsd
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY services/auth-service/package*.json ./services/auth-service/
COPY services/file-service/package*.json ./services/file-service/
COPY services/worker/package*.json ./services/worker/
COPY services/gateway/package*.json ./services/gateway/
RUN npm ci --omit=dev && npm cache clean --force

# --- STAGE 4: Auth Service ---
FROM runner-base AS auth-service
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist
COPY --from=builder /app/services/auth-service/package*.json ./services/auth-service/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
EXPOSE 3001
CMD ["node", "services/auth-service/dist/server.js"]

# --- STAGE 5: File Service ---
FROM runner-base AS file-service
COPY --from=builder /app/services/file-service/dist ./services/file-service/dist
COPY --from=builder /app/services/file-service/package*.json ./services/file-service/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
EXPOSE 3002
CMD ["node", "services/file-service/dist/server.js"]

# --- STAGE 6: Worker ---
FROM runner-base AS worker
COPY --from=builder /app/services/worker/dist ./services/worker/dist
COPY --from=builder /app/services/worker/package*.json ./services/worker/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
CMD ["node", "services/worker/dist/server.js"]

# --- STAGE 7: Gateway ---
FROM runner-base AS gateway
COPY --from=builder /app/services/gateway/dist ./services/gateway/dist
COPY --from=builder /app/services/gateway/package*.json ./services/gateway/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
EXPOSE 3000
CMD ["node", "services/gateway/dist/server.js"]

# --- STAGE 8: Static Site ---
FROM nginx:stable-alpine AS static-site
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist/client /usr/share/nginx/html
EXPOSE 80 443