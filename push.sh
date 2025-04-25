#!/bin/bash

# Check if the correct number of arguments is provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <branch_name> <commit_message>"
  exit 1
fi

# Assign the arguments to variables
branch_name="$1"
commit_message="$2"

# Add all changes
git add .

# Commit the changes with the provided message
git commit -m "$commit_message"

# Push the changes to the specified branch
git push origin "$branch_name"

echo "Successfully pushed to branch '$branch_name' with commit message: '$commit_message'"