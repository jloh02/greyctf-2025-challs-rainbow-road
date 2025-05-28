FROM node:slim AS builder
WORKDIR /app
COPY . .
RUN yarn
RUN yarn build
COPY /app/dist /usr/share/nginx/html
