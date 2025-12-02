#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== MenuCraft Deployment Script ===${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and fill in the values."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Parse arguments
ACTION=${1:-"deploy"}

case $ACTION in
    deploy)
        echo -e "${YELLOW}Building and deploying services...${NC}"
        docker compose build --no-cache
        docker compose up -d
        
        echo -e "${YELLOW}Waiting for services to start...${NC}"
        sleep 10
        
        echo -e "${YELLOW}Running database migrations...${NC}"
        docker compose exec -T api node -e "
            const { exec } = require('child_process');
            exec('npx drizzle-kit push', { cwd: '/app/packages/database' }, (err, stdout, stderr) => {
                console.log(stdout);
                if (err) console.error(stderr);
            });
        " || echo "Note: Run migrations manually if needed"
        
        echo -e "${GREEN}Deployment complete!${NC}"
        docker compose ps
        ;;
        
    update)
        echo -e "${YELLOW}Pulling latest changes and redeploying...${NC}"
        git pull origin main
        docker compose build --no-cache
        docker compose up -d
        echo -e "${GREEN}Update complete!${NC}"
        docker compose ps
        ;;
        
    logs)
        docker compose logs -f ${2:-""}
        ;;
        
    status)
        docker compose ps
        ;;
        
    stop)
        echo -e "${YELLOW}Stopping services...${NC}"
        docker compose down
        echo -e "${GREEN}Services stopped.${NC}"
        ;;
        
    restart)
        echo -e "${YELLOW}Restarting services...${NC}"
        docker compose restart
        echo -e "${GREEN}Services restarted.${NC}"
        ;;
        
    backup)
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        echo -e "${YELLOW}Creating database backup: ${BACKUP_FILE}${NC}"
        docker compose exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_FILE
        echo -e "${GREEN}Backup created: ${BACKUP_FILE}${NC}"
        ;;
        
    ssl)
        echo -e "${YELLOW}Setting up SSL certificates...${NC}"
        DOMAIN=${2:-"yourdomain.com"}
        EMAIL=${3:-"admin@$DOMAIN"}
        
        # Run certbot
        docker run -it --rm \
            -v $(pwd)/ssl:/etc/letsencrypt \
            -v $(pwd)/certbot:/var/www/certbot \
            certbot/certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email $EMAIL \
            --agree-tos \
            --no-eff-email \
            -d $DOMAIN \
            -d api.$DOMAIN \
            -d app.$DOMAIN
            
        echo -e "${GREEN}SSL certificates created!${NC}"
        echo "Don't forget to uncomment the HTTPS sections in nginx.conf"
        ;;
        
    *)
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  deploy    - Build and deploy all services (default)"
        echo "  update    - Pull latest code and redeploy"
        echo "  logs      - View logs (optionally specify service: logs api)"
        echo "  status    - Show running containers"
        echo "  stop      - Stop all services"
        echo "  restart   - Restart all services"
        echo "  backup    - Create database backup"
        echo "  ssl       - Set up SSL certificates (ssl domain.com email@domain.com)"
        ;;
esac
