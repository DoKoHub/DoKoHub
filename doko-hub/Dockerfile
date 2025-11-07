# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manager files and .npmrc
COPY package.json package-lock.json .npmrc ./

RUN mkdir -p static

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy"

# Build the SvelteKit application
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user and group for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production dependencies definition
COPY package.json .

# Install only production dependencies
RUN npm install --omit=dev

# Copy the built application from the builder stage and set ownership
COPY --from=builder --chown=appuser:appgroup /app/build ./build

# Switch to the non-root user
USER appuser

# Expose the port the app will run on
EXPOSE 3000

# Set the command to start the app
CMD ["node", "build"]

