FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package and lock files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire source code and tsconfig.json
COPY . .

# Build the TypeScript code
RUN npx tsc

# By default, run the compiled app
CMD ["node", "dist/index.js"]
