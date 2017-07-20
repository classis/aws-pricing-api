FROM node:8.2.0-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install
COPY .babelrc /usr/src/app/
COPY server.js /usr/src/app/
EXPOSE 3000
CMD [ "npm", start" ]
