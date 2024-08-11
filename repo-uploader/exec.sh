#!/bin/bash

export GIT_REPOSITORY__URL="$GIT_REPOSITORY__URL"
export SOURCE_DIRECTORY="$SOURCE_DIRECTORY"

git clone "$GIT_REPOSITORY__URL" /home/app/repo

cp -r /home/app/repo/"$SOURCE_DIRECTORY" /home/app/output

exec node script.js
