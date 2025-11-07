#########################################
# 1. Build-Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Dependencies und Theme vorbereiten
COPY package.json package-lock.json .npmrc ./
COPY src/theme ./src/theme

RUN mkdir -p static

# Dev- und Build-Tools installieren
RUN npm install

# Restlichen Quellcode kopieren
COPY . .

# (Optional) Umgebungsvariablen für das Build festlegen
ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy"

# Build/Prepare Schritt – devDependencies sind noch da!
RUN npm run build

#########################################
# 2. Production-Stage
FROM node:20-alpine AS runner
WORKDIR /app

# Security: Setze Appuser
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Nur production-deps installieren
COPY package.json ./
RUN npm pkg delete scripts.prepare
RUN npm install --omit=dev

# Build-Output & statische Assets übernehmen
COPY --from=builder --chown=appuser:appgroup /app/build ./build
COPY --from=builder --chown=appuser:appgroup /app/static ./static

USER appuser

EXPOSE 3000

# Starte den SvelteKit-Node-Adapter (z.B. build/index.js, prüfe Adapter-Doku!)
CMD ["node", "build"]
