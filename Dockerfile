FROM node:20-bookworm-slim

WORKDIR /app

# Build tools are needed only if sqlite3 has to compile its native binding.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["sh", "-c", "npm run generate:keys:if-missing && npm run seed && npm start"]
