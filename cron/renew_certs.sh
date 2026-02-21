#!/bin/bash

# 1. Stop the Nginx container to free up Port 80
docker stop uploader-nginx

# 2. Run Certbot to renew (it only renews if the cert is close to expiring)
docker run --rm -v "$(pwd)/certs:/etc/letsencrypt" \
  -p 80:80 certbot/certbot renew

# 3. Start Nginx back up
docker start uploader-nginx