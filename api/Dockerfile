# ----- build -----
    FROM node:20-bookworm AS build
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci --omit=dev
    COPY . .
    RUN npm run build   # si vous transpilez (TS) – sinon supprimez
    
    # ----- runtime -----
    FROM node:20-slim
    WORKDIR /app
    COPY --from=build /app .
    EXPOSE 3000
    CMD ["node", "dist/index.js"]  # ou src/index.js si pas de build