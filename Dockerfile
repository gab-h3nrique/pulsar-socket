FROM node:20-alpine as deps

# Install dependencies only when needed

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json .env* ./

RUN npm install

COPY . .

RUN npm run build

# FROM node:20-alpine as production

# ARG NODE_ENV=production
# ENV NODE_ENV=${NODE_ENV}

# WORKDIR /app

# COPY package*.json ./

# RUN npm ci --only=production

# COPY --from=deps /app/dist ./dist/
# COPY --from=deps /app/.env* ./

# ENV HOSTNAME "0.0.0.0"
EXPOSE 3000

CMD ["node", "--env-file=.env", "dist/server.js"]






