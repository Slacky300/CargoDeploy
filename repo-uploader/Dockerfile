FROM ubuntu:focal

# Install curl and Node.js 20
RUN apt-get update && \
    apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get upgrade -y && \
    apt-get install -y nodejs git

# Set the working directory
WORKDIR /home/app

# Copy the necessary files into the container
COPY exec.sh exec.sh
COPY src/ src/
COPY .env .env
COPY tsconfig.json tsconfig.json
COPY package*.json ./

# Install project dependencies
RUN npm install

# Compile TypeScript files to JavaScript
RUN npx tsc

# Make the scripts executable
RUN chmod +x exec.sh
RUN chmod +x dist/script.js
RUN chmod +x src/script.ts
RUN chmod +x package.json

# Set the entrypoint to execute the shell script
ENTRYPOINT [ "/home/app/exec.sh" ]
