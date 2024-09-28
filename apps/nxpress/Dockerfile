FROM node:16-alpine

WORKDIR /app

COPY dist/apps/nxpress /app

RUN npm install -g serve

CMD ["serve", "-s", "dist/apps/nxpress"]
