FROM node
RUN mkdir /app
WORKDIR /app
COPY nodejs-service/ .
RUN npm install
EXPOSE 3000
CMD ["npm", "start"]