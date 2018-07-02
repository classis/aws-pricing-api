FROM node:10.5.0-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY ./ /usr/src/app/
EXPOSE 3000
CMD [ "yarn", "start-prod" ]
