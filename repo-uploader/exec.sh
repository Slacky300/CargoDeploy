#!/bin/bash

export GIT_REPOSITORY__URL="$GIT_REPOSITORY__URL"
export SOURCE_DIRECTORY="$SOURCE_DIRECTORY"

echo "🚀 Cloning repository from $GIT_REPOSITORY__URL..."
git clone "$GIT_REPOSITORY__URL" /home/app/repo

echo "📂 Copying source directory $SOURCE_DIRECTORY to output..."
cp -r /home/app/repo/"$SOURCE_DIRECTORY" /home/app/output

echo "🛠️ Compiling TypeScript files..."
npx tsc

echo "⚙️ Executing script.js..."
exec node dist/script.js
