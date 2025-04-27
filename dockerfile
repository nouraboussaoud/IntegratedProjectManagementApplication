# Node.js base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Set correct npm registry
RUN npm config set registry https://registry.npmjs.org/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Start command
CMD ["npm", "start"]
