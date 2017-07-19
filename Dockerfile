FROM node:6.11.1-alpine
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY node_modules /usr/src/app/node_modules
COPY package.json /usr/src/app/
COPY .babelrc /usr/src/app/
COPY server.js /usr/src/app/
COPY schema.js /usr/src/app/
EXPOSE 3000
CMD [ "npm", "run", "production" ]