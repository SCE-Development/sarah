FROM node:21-alpine

WORKDIR /sarah

# dependencies for node-gyp
RUN apk add --no-cache python3 make g++ 

COPY package*.json ./

# we use NPM_INSTALL_ARGS to add --omit=dev
# when running the real discord bot
ARG NPM_INSTALL_ARGS

RUN npm install $NPM_INSTALL_ARGS

CMD [ "npm", "start" ]
