
FROM oven/bun:1.1.18-ubuntu

WORKDIR /app

COPY package.json bun.lockb tsconfig.json ./
RUN bun install

COPY . .

RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]

