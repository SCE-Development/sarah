FROM node:21-alpine

WORKDIR /sarah

# dependencies for node-gyp
RUN apk add --no-cache python3 make g++ 

COPY package*.json ./

RUN npm install --omit=dev

CMD [ "npm", "start" ]
