FROM node:18-alpine

WORKDIR /app

COPY chess_realm/backend/package.json ./chess_realm/backend/package.json

RUN npm --prefix chess_realm/backend install

# This copies BOTH frontend/ and backend/ into the container
COPY . .

EXPOSE 3000

CMD ["node", "chess_realm/backend/server.js"]