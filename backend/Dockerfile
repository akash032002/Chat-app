# Start from an official Node.js image (includes both node and npm)
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy only the backend directory from your project
COPY ./backend ./backend

# Install backend dependencies
RUN npm install --prefix backend

# Expose backend port (change it to match your app, e.g. 5000 or 3000)
EXPOSE 3001

# Start the backend server
CMD ["node", "backend/server.js"]
