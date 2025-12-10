# MenuCraft VPS Deployment

This guide explains how to deploy MenuCraft to a VPS using Docker Compose.

## Prerequisites

- A VPS with at least 2GB RAM and 20GB storage
- Ubuntu 22.04 or similar Linux distribution
- Domain name with DNS configured
- Docker and Docker Compose installed

## VPS Setup

### 1. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Logout and login again for group changes to take effect
```

### 2. Clone the Repository

```bash
git clone https://github.com/your-repo/menu-craft-v2.git
cd menu-craft-v2/deploy
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
```

Required environment variables:
- `POSTGRES_PASSWORD` - Strong password for PostgreSQL
- `CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
- `CLERK_SECRET_KEY` - From Clerk dashboard
- `STRIPE_SECRET_KEY` - From Stripe dashboard (if using payments)
- `API_URL`, `WEB_URL`, `PUBLIC_URL` - Your domain URLs

### 4. Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy all services
./deploy.sh deploy
```

## Commands

| Command | Description |
|---------|-------------|
| `./deploy.sh deploy` | Build and deploy all services |
| `./deploy.sh update` | Pull latest code and redeploy |
| `./deploy.sh logs` | View all logs |
| `./deploy.sh logs api` | View API logs |
| `./deploy.sh status` | Show running containers |
| `./deploy.sh stop` | Stop all services |
| `./deploy.sh restart` | Restart all services |
| `./deploy.sh backup` | Create database backup |
| `./deploy.sh ssl yourdomain.com` | Set up SSL certificates |

## Setting Up SSL (HTTPS)

### 1. Point your domains to the VPS

Configure DNS A records:
- `yourdomain.com` → VPS IP
- `api.yourdomain.com` → VPS IP
- `app.yourdomain.com` → VPS IP

### 2. Run the SSL command

```bash
./deploy.sh ssl yourdomain.com admin@yourdomain.com
```

### 3. Update nginx.conf

Edit `nginx.conf` and uncomment the HTTPS sections. Update the domain names.

### 4. Restart nginx

```bash
docker compose restart nginx
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        VPS                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │                   Nginx (Port 80/443)             │   │
│  │           Reverse Proxy + SSL Termination         │   │
│  └──────────────────┬───────────────┬───────────────┘   │
│                     │               │                    │
│           /api/*    │               │    /*              │
│                     ▼               ▼                    │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │     API (Node.js)    │  │   Web (nginx + SPA)   │    │
│  │      Port 3000       │  │      Port 80          │    │
│  └──────────────────────┘  └──────────────────────┘     │
│             │                                            │
│             ▼                                            │
│  ┌──────────────────────┐                               │
│  │     PostgreSQL       │                               │
│  │      Port 5432       │                               │
│  └──────────────────────┘                               │
└─────────────────────────────────────────────────────────┘
```

## Updating

To update to the latest version:

```bash
cd menu-craft-v2/deploy
git pull origin main
./deploy.sh update
```

## Troubleshooting

### View logs
```bash
./deploy.sh logs        # All services
./deploy.sh logs api    # API only
./deploy.sh logs web    # Web only
./deploy.sh logs nginx  # Nginx only
```

### Check container status
```bash
docker compose ps
```

### Restart a specific service
```bash
docker compose restart api
```

### Access database
```bash
docker compose exec postgres psql -U menucraft -d menucraft
```

### Reset everything (CAUTION: destroys data)
```bash
docker compose down -v  # -v removes volumes
./deploy.sh deploy
```

## Backups

### Create backup
```bash
./deploy.sh backup
```

### Restore backup
```bash
docker compose exec -T postgres psql -U menucraft -d menucraft < backup_YYYYMMDD_HHMMSS.sql
```

## Security Recommendations

1. Use a firewall (ufw) to only allow ports 80 and 443
2. Set up fail2ban for SSH protection
3. Use SSH keys instead of passwords
4. Regularly update the system: `sudo apt update && sudo apt upgrade`
5. Set up automatic security updates

```bash
# Enable firewall
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```
.
