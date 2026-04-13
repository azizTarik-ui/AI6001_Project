FROM node:18-alpine

WORKDIR /app

COPY backend/package.json ./backend/package.json

RUN cd backend && npm install

# This copies BOTH frontend/ and backend/ into the container
COPY . .

EXPOSE 3000

CMD ["node", "backend/server.js"]