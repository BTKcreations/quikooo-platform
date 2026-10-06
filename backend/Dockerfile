FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts
ENV NODE_ENV=production PORT=5001
EXPOSE 5001
CMD ["sh", "-c", "node scripts/migrate.js && node src/index.js"]
