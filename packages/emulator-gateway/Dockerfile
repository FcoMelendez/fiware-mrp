FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 8090
CMD ["npx", "tsx", "src/index.ts"]
