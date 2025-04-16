#!/bin/bash
git fetch && \
git merge origin/dev -m "merged" && \
pm2 restart ucs-icchw-gateway-backend && \
pm2 logs ucs-icchw-gateway-backend