#!/bin/bash

export GIT_REPOSITORY_URL="$GIT_REPOSITORY_URL"
export SOURCE_DIRECTORY="$SOURCE_DIRECTORY"
export ACCESS_TOKEN="$ACCESS_TOKEN"

if [ -z "$GIT_REPOSITORY_URL" ] || [ -z "$SOURCE_DIRECTORY" ]; then
  echo "❌ Error: Missing required environment variables."
  echo "Ensure GIT_REPOSITORY_URL and SOURCE_DIRECTORY are set."
  exit 1
fi

REPO_URL_REGEX="https://github.com/([^/]+)/([^/]+).git"
if [[ $GIT_REPOSITORY_URL =~ $REPO_URL_REGEX ]]; then
  USERNAME="${BASH_REMATCH[1]}"
  REPO_NAME="${BASH_REMATCH[2]}"
else
  echo "❌ Error: Invalid GIT_REPOSITORY_URL format."
  echo "Expected format: https://github.com/username/repository_name.git"
  exit 1
fi

if [ -n "$ACCESS_TOKEN" ]; then
  AUTHENTICATED_URL="https://x-access-token:$ACCESS_TOKEN@github.com/$USERNAME/$REPO_NAME"
  echo "🔑 Access token provided. Using authenticated URL to clone."
else
  AUTHENTICATED_URL="$GIT_REPOSITORY_URL"
  echo "🔓 No access token provided. Using the original URL to clone."
fi

echo "🚀 Cloning repository from $AUTHENTICATED_URL..."
git clone "$AUTHENTICATED_URL" /home/app/repo || {
  echo "❌ Error: Failed to clone the repository."
  exit 1
}

if [ -d "/home/app/repo/$SOURCE_DIRECTORY" ]; then
  echo "📂 Copying source directory $SOURCE_DIRECTORY to output..."
  cp -r /home/app/repo/"$SOURCE_DIRECTORY" /home/app/output || {
    echo "❌ Error: Failed to copy source directory."
    exit 1
  }
else
  echo "❌ Error: Source directory $SOURCE_DIRECTORY does not exist in the repository."
  exit 1
fi

echo "🛠️ Compiling TypeScript files..."
npx tsc || {
  echo "❌ Error: TypeScript compilation failed."
  exit 1
}

echo "⚙️ Executing script.js..."
exec node dist/script.js || {
  echo "❌ Error: Failed to execute script.js."
  exit 1
}
