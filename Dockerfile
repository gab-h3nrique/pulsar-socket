FROM node:18-alpine as development

# Install dependencies only when needed

# RUN apk add --no-cache libc6-compat

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# WORKDIR ./dist

# ENV HOSTNAME "0.0.0.0"
EXPOSE 3000

# CMD node index.js
CMD ["node", "dist/index.js"]







