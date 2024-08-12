# Develope step
FROM node:18-alpine as development

WORKDIR /usr/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]

# Production step
FROM node:18-alpine as production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=development /usr/app/dist ./dist

RUN ls -l ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
