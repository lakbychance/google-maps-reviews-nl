FROM node
RUN mkdir /app
WORKDIR /app
COPY nodejs-service/ .
RUN npm install
CMD ["npm", "start"]