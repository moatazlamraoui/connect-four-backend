FROM node:20-bookworm-slim

WORKDIR /app

# Build tools are needed only if sqlite3 has to compile its native binding.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Reproducible install when a lockfile is committed, plain install otherwise.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

# Database and generated JWT keys live in /app/data (a Docker volume); run as the unprivileged "node" user.
RUN mkdir -p /app/data && chown -R node:node /app/data
ENV JWT_KEYS_FILE=/app/data/jwt-keys.env
USER node

EXPOSE 3000
# 1) create the RS256 key pair once (skipped if keys are already provided through .env)
# 2) seed the database (idempotent)  3) start the API
CMD ["sh", "-c", "node scripts/generate-keys.js --if-missing --out \"$JWT_KEYS_FILE\" && npm run seed && node dist/src/server.js"]
