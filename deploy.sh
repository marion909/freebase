#!/bin/bash
# Freebase Production Deployment Script
# Usage: ./deploy.sh [option]
# Options: pull, restart, full (pull + restart + verify)

set -e

COMPOSE_FILE="/opt/freebase/docker-compose.production.yml"
APP_DIR="/opt/freebase"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_env() {
    if [ ! -f "$APP_DIR/.env" ]; then
        log_error ".env file not found in $APP_DIR"
        exit 1
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "docker-compose.production.yml not found at $COMPOSE_FILE"
        exit 1
    fi
    
    log_info "Environment check passed"
}

pull_images() {
    log_info "Pulling latest Docker images..."
    cd "$APP_DIR"
    docker-compose -f docker-compose.production.yml pull
    log_info "Images pulled successfully"
}

restart_services() {
    log_info "Restarting services..."
    cd "$APP_DIR"
    docker-compose -f docker-compose.production.yml up -d
    log_info "Services restarted"
}

verify_health() {
    log_info "Verifying service health..."
    cd "$APP_DIR"
    
    # Wait for services to be ready
    sleep 5
    
    # Check container status
    STATUS=$(docker-compose -f docker-compose.production.yml ps --format json | grep -c '"State":"running"' || echo "0")
    TOTAL=$(docker-compose -f docker-compose.production.yml ps --services | wc -l)
    
    log_info "Running containers: $STATUS / $TOTAL"
    
    # Check PostgreSQL
    if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        log_info "PostgreSQL is healthy"
    else
        log_warn "PostgreSQL health check inconclusive"
    fi
    
    # Show service logs
    log_info "Recent logs:"
    docker-compose -f docker-compose.production.yml logs --tail=10
}

show_status() {
    log_info "Current service status:"
    cd "$APP_DIR"
    docker-compose -f docker-compose.production.yml ps
}

case "${1:-full}" in
    pull)
        check_env
        pull_images
        ;;
    restart)
        check_env
        restart_services
        ;;
    verify)
        verify_health
        ;;
    status)
        show_status
        ;;
    full)
        check_env
        pull_images
        restart_services
        verify_health
        ;;
    *)
        echo "Usage: $0 {pull|restart|verify|status|full}"
        echo "  pull   - Pull latest Docker images"
        echo "  restart - Restart all services"
        echo "  verify - Verify service health"
        echo "  status - Show current service status"
        echo "  full   - Pull, restart, and verify (default)"
        exit 1
        ;;
esac

log_info "Deployment completed successfully!"
