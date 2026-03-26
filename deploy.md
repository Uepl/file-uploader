
---

# 🚀 Deployment Guide: File Uploader Stack

This guide covers the deployment of the DuckDNS, API, and Nginx services using Docker Compose.

## 1. Server Preparation
Log into your VPS (e.g., GCP e2-micro) and ensure Docker is installed.

```bash
# Update and install Docker (Ubuntu example)
sudo apt-get update
sudo apt-get install docker.io docker-compose -y
sudo usermod -aG docker $USER && newgrp docker
```

## 2. Project Structure
Ensure your server directory looks like this:
```text
/my-app/
├── certs/                # For SSL certificates
├── log/                  # For API logs
├── .env                  # Environment variables
├── docker-compose.yml    # Your provided YAML
├── Dockerfile            # Your provided Dockerfile
└── nginx.conf            # Nginx configuration
```

## 3. Configure Environment Variables
Create the `.env` file to store sensitive tokens and configuration:

```bash
# .env
DUCKDNS_TOKEN=your-duckdns-token-here
NODE_ENV=production
# Add GCS bucket names or API keys here
```

## 4. Nginx Configuration
Since your `Dockerfile` copies `dist/` to `/usr/share/nginx/html`, your `nginx.conf` must point there and proxy API requests.

```nginx
events {}
http {
    include /etc/nginx/mime.types;
    server {
        listen 80;
        server_name file-uploader-in-dierl.duckdns.org;

        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        location /api/ {
            proxy_pass http://api:3000/;
            proxy_set_header Host $host;
        }
    }
}
```

## 5. Deployment Commands

### Build and Start
On an **e2-micro**, the build might be slow. The `--build` flag ensures your latest code is compiled.

```bash
docker-compose up -d --build
```

### Verify Services
```bash
# Check if containers are running
docker-compose ps

# Monitor logs if something fails
docker-compose logs -f
```

---

## ⚠️ E2-Micro Optimization
Because you are building a **Node 22** environment on a machine with limited RAM:

1.  **Swap Space:** If the build crashes, create a 2GB swap file on your VPS to prevent "Out of Memory" errors.
2.  **External Build:** If it's still too slow, build the image on your local machine, push it to **Docker Hub**, and update the `image:` tag in your `docker-compose.yml` to pull the pre-built image instead of using `build: .`.

## 🔒 Enabling HTTPS (SSL)
Once the site is running on port 80, you can use **Certbot** to generate certificates. Map the output to your `./certs` folder so the Nginx container can see them.

```bash
sudo apt install certbot -y
sudo certbot certonly --manual --preferred-challenges dns -d file-uploader-in-dierl.duckdns.org
```

---
