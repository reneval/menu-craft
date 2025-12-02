# MenuCraft Deployment Guide

This guide covers deploying MenuCraft to production using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Domain names configured (e.g., api.yourdomain.com, app.yourdomain.com)
- SSL certificates (use Let's Encrypt with a reverse proxy like Traefik or Caddy)
- External services configured:
  - PostgreSQL database (or use the included container)
  - Clerk account (authentication)
  - Stripe account (payments)
  - Cloudflare R2 or S3 (optional, for image storage)

## Quick Start with Docker Compose

### 1. Clone and Configure

```bash
git clone https://github.com/your-org/menucraft.git
cd menucraft

# Copy environment template
cp .env.production.example .env

# Edit with your production values
nano .env
```

### 2. Build and Run

```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 3. Initialize Database

```bash
# Run database migrations
docker compose -f docker-compose.prod.yml exec api pnpm db:push
```

## GitHub Actions CI/CD

The project includes GitHub Actions workflows for automated deployments.

### Required Secrets

Configure these secrets in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `VITE_API_URL` | Production API URL (e.g., https://api.yourdomain.com) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `DB_PASSWORD` | Database password |
| `DEPLOY_HOST` | (Optional) SSH host for deployment |
| `DEPLOY_USER` | (Optional) SSH username |
| `DEPLOY_KEY` | (Optional) SSH private key |

### Workflows

- **CI** (`ci.yml`): Runs on every push/PR - linting, type checking, tests, and Docker build verification
- **Deploy** (`deploy.yml`): Runs on push to main - builds and pushes images to GitHub Container Registry

### Pulling Images

Images are published to GitHub Container Registry:

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull latest images
docker pull ghcr.io/your-org/menucraft/api:latest
docker pull ghcr.io/your-org/menucraft/web:latest
```

## Health Checks

The API provides health check endpoints for monitoring:

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness probe - basic health check |
| `GET /health/db` | Database connectivity check |
| `GET /ready` | Readiness probe - checks all dependencies |

### Kubernetes Probes Example

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Reverse Proxy Configuration

### Traefik (Recommended)

```yaml
# docker-compose.override.yml
services:
  traefik:
    image: traefik:v2.10
    command:
      - --api.dashboard=true
      - --providers.docker=true
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.letsencrypt.acme.httpchallenge=true
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
      - --certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt

  api:
    labels:
      - traefik.enable=true
      - traefik.http.routers.api.rule=Host(`api.yourdomain.com`)
      - traefik.http.routers.api.tls.certresolver=letsencrypt

  web:
    labels:
      - traefik.enable=true
      - traefik.http.routers.web.rule=Host(`app.yourdomain.com`)
      - traefik.http.routers.web.tls.certresolver=letsencrypt

volumes:
  letsencrypt:
```

### Nginx (Alternative)

```nginx
# /etc/nginx/sites-available/menucraft
upstream api {
    server localhost:3000;
}

upstream web {
    server localhost:80;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Database Management

### Backups

```bash
# Create backup
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U menucraft menucraft > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20240101.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U menucraft menucraft
```

### Migrations

```bash
# Push schema changes
docker compose -f docker-compose.prod.yml exec api pnpm db:push

# Generate migration (development)
pnpm db:generate
```

## Monitoring

### Recommended Stack

- **Prometheus** - Metrics collection
- **Grafana** - Dashboards and alerting
- **Loki** - Log aggregation

### Docker Stats

```bash
# View resource usage
docker stats menucraft-api menucraft-web menucraft-db
```

## Scaling

### Horizontal Scaling

```bash
# Scale API instances
docker compose -f docker-compose.prod.yml up -d --scale api=3
```

Note: When scaling horizontally, ensure:
- Session state is stored externally (Redis)
- File uploads use external storage (R2/S3)
- Load balancer distributes traffic

## Troubleshooting

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

### Container Shell Access

```bash
# API container
docker compose -f docker-compose.prod.yml exec api sh

# Database container
docker compose -f docker-compose.prod.yml exec postgres psql -U menucraft
```

### Common Issues

**API not starting:**
- Check DATABASE_URL is correct
- Verify database is accessible
- Check logs for missing environment variables

**Web app shows blank page:**
- Verify VITE_API_URL is set correctly
- Check browser console for CORS errors
- Ensure API is accessible from the web container

**Database connection refused:**
- Wait for postgres health check to pass
- Verify network configuration
- Check firewall rules

## Security Checklist

- [ ] Use strong, unique passwords for all services
- [ ] Enable SSL/TLS for all public endpoints
- [ ] Configure firewall to only expose necessary ports
- [ ] Set up automated backups
- [ ] Enable rate limiting on API
- [ ] Configure CORS for your domains only
- [ ] Use secrets management (not .env files in production)
- [ ] Enable database connection encryption
- [ ] Set up monitoring and alerting
- [ ] Regular security updates for Docker images
