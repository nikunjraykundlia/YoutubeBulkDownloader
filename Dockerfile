FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Download and install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create downloads directory
RUN mkdir -p downloads

# Expose port
EXPOSE 10000

# Start the application
CMD ["npm", "start"] 