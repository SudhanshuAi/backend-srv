# 1. Use an official Node.js runtime as a parent image
FROM node:18-slim

# 2. Set the working directory in the container
WORKDIR /app

# 3. Copy package.json and package-lock.json first for caching
COPY package*.json ./

# 4. Install app dependencies
RUN npm install

# 5. Explicitly copy the application source code
COPY sql-worker.js .
COPY redis-config.js . 

# 6. Define the command to run your app
CMD ["node", "sql-worker.js"]