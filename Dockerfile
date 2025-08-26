# 1. Use an official Node.js runtime as a parent image
FROM node:18-slim

# 2. Set the working directory in the container
WORKDIR /app

# 3. Copy package.json and package-lock.json first for caching
COPY package*.json ./

# 4. Install app dependencies
# Use --only=production to avoid installing devDependencies
RUN npm install --only=production

# 5. Explicitly copy the application source code
COPY sql-worker.js .
COPY redis-config.js .
COPY api-server.js . 

# 6. Expose the internal port for the API server
EXPOSE 3000

# The default command is now handled by docker-compose
CMD ["node", "sql-worker.js"]