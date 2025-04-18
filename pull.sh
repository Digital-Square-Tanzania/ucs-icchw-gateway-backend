#!/bin/bash
git fetch && \
git merge origin/dev -m "merged" && \
pm2 restart gateway-backend && \
pm2 logs gateway-backend