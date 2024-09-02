FROM node:14

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose port
EXPOSE 3000

# Use a non-root user
RUN useradd -m appuser
USER appuser

# Run the application
CMD ["node", "main.js"]