# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
# This is done separately to leverage Docker's caching for dependencies
COPY backend/package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the backend application code
COPY backend/ .

# Expose the port your app runs on
EXPOSE 3001

# Define the command to run your app
CMD ["node", "server.js"]
