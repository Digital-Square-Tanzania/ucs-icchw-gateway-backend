#!/bin/bash
git fetch && \
git merge origin/dev -m "merged" && \
pm2 restart icchw-gateway-backend && \
pm2 logs icchw-gateway-backend