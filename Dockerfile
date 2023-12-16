FROM node:20 AS build
RUN apt-get update -y
RUN apt-get install -y --no-install-recommends \
    g++ \
    protobuf-compiler \
    libprotobuf-dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run generate-ts
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/out ./out
CMD ["node", "out/index.js"]
