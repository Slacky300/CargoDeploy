#!/bin/bash

export GIT_REPOSITORY_URL="$GIT_REPOSITORY_URL"
export SOURCE_DIRECTORY="$SOURCE_DIRECTORY"
export ACCESS_TOKEN="$ACCESS_TOKEN"
export BRANCH="${BRANCH:-master}" 

# Validate required environment variables
if [ -z "$GIT_REPOSITORY_URL" ] || [ -z "$SOURCE_DIRECTORY" ]; then
  echo "❌ Missing required information: GIT_REPOSITORY_URL and SOURCE_DIRECTORY are mandatory. Please check your configuration."
  exit 1
fi

# Extract repository information
REPO_URL_REGEX="https://github.com/([^/]+)/([^/]+).git"
if [[ $GIT_REPOSITORY_URL =~ $REPO_URL_REGEX ]]; then
  USERNAME="${BASH_REMATCH[1]}"
  REPO_NAME="${BASH_REMATCH[2]}"
else
  echo "❌ Invalid repository URL. Ensure it follows the format: https://github.com/username/repository_name.git"
  exit 1
fi

# Configure authenticated or public URL for cloning
if [ -n "$ACCESS_TOKEN" ]; then
  AUTHENTICATED_URL="https://x-access-token:$ACCESS_TOKEN@github.com/$USERNAME/$REPO_NAME"
  echo "🔑 Access token detected. Using secure access for cloning."
else
  AUTHENTICATED_URL="$GIT_REPOSITORY_URL"
  echo "🔓 No access token provided. Proceeding with public repository access."
fi

# Clone the repository
echo "🚀 Initiating repository clone: Branch '$BRANCH', URL: $GIT_REPOSITORY_URL"
git clone --branch "$BRANCH" "$AUTHENTICATED_URL" /home/app/repo || {
  echo "❌ Repository clone failed. Verify the branch name and repository URL."
  exit 1
}

# Verify and copy source directory
if [ -d "/home/app/repo/$SOURCE_DIRECTORY" ]; then
  echo "📂 Preparing source directory: $SOURCE_DIRECTORY"
  cp -r /home/app/repo/"$SOURCE_DIRECTORY" /home/app/output || {
    echo "❌ Source directory copy failed. Check permissions or path validity."
    exit 1
  }
else
  echo "❌ Source directory '$SOURCE_DIRECTORY' not found in the repository. Please ensure it exists."
  exit 1
fi

# Compile TypeScript files
echo "🛠️ Compiling TypeScript files..."
npx tsc || {
  echo "❌ TypeScript compilation error. Resolve issues in your TypeScript code and try again."
  exit 1
}

# Execute the main script
echo "⚙️ Running the main script (script.js)..."
exec node dist/script.js || {
  echo "❌ Execution of script.js failed. Check the script or environment configuration."
  exit 1
}
