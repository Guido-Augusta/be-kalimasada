FROM node:20-alpine

WORKDIR /app

# Copy package.json & lock file dulu
COPY package*.json ./

# Install semua dependency (termasuk devDeps)
RUN npm install

# Copy tsconfig
COPY tsconfig.json ./

# Copy seluruh source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production should run compiled JS
CMD ["node", "dist/index.js"]
