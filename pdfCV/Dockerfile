# Use the official Node.js image from the Docker Hub
FROM node:22.14-alpine

# Set the working directory
WORKDIR /usr/src/app

# Install pdflatex
RUN apk update && apk add --no-cache texlive-full

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Create a prestart.js file to run the application
RUN echo "require('./index.js');" >> prestart.js

# Expose the port from the .env file
ARG SERVER_PORT
ENV SERVER_PORT=${SERVER_PORT}
EXPOSE ${SERVER_PORT}

# Command to run the application
CMD ["node", "prestart.js"]