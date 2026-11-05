FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:alpine
RUN apk upgrade --no-cache && apk add --no-cache 'apk-tools>=3.0.9-r0' 'libapk>=3.0.9-r0'
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
