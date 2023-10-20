FROM node:19
RUN npm install --g bun

WORKDIR /app

COPY package.json ./
COPY bun.lockb ./

RUN bun install

COPY . .

ENV NODE_ENV production
CMD ["bun", "src/index.ts"]

EXPOSE 25615