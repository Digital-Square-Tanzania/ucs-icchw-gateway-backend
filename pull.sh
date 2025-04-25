#!/bin/bash

# Define the target branch (you can make this an argument too, if needed)
target_branch="origin/dev"
service_name="gateway-backend"

echo "Starting the pull and update process..."
echo "Fetching latest changes from the remote repository..."
git fetch

if [ $? -ne 0 ]; then
  echo "Error: Failed to fetch changes. Please check your network connection and repository status."
  exit 1
fi

echo "Successfully fetched changes."
echo "Attempting to merge '$target_branch' into the current branch..."
git merge "$target_branch" -m "Merge from $target_branch"

if [ $? -ne 0 ]; then
  echo "Warning: Merge conflicts encountered. Please resolve them and then re-run this script."
  exit 1
fi

echo "Successfully merged '$target_branch'."
echo "Restarting the service: '$service_name'..."
pm2 restart "$service_name"

if [ $? -ne 0 ]; then
  echo "Error: Failed to restart the service '$service_name'. Please check PM2 status."
  exit 1
fi

echo "Service '$service_name' restarted successfully."
echo "Displaying logs for '$service_name' (press Ctrl+C to stop):"
pm2 logs "$service_name" --lines 50 # Show last 50 lines initially

echo "Pull and update process completed."