# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json from the build context (which is 'backend')
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the backend application code from the build context
COPY . .

# Expose the port your app runs on
EXPOSE 3001

# Define the command to run your app
CMD ["node", "server.js"]
