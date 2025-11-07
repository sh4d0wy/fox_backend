FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json .
COPY prisma.config.ts .
RUN yarn prisma:merge

COPY . .

RUN yarn build

ENV DATABASE_URL=mysql://root:root@localhost:3306/backend
ENV NODE_ENV=production
ENV REDIS_URL=redis://redis:6379


EXPOSE 3000

CMD ["sh", "-c", "yarn prisma migrate deploy && yarn prisma generate && yarn start"]