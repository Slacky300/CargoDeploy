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
COPY package.json .
COPY package-lock.json .

# Install project dependencies
RUN npm install

COPY exec.sh .
COPY dist/script.js .
COPY dist/constants.js .
COPY .env .

# Make the scripts executable
RUN chmod +x /home/app/exec.sh
RUN chmod +x /home/app/script.js

# Set the entrypoint to execute the shell script
ENTRYPOINT [ "/home/app/exec.sh" ]