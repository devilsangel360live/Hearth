# Docker Deployment Guide for Hearth Recipe App

This guide explains how to deploy the Hearth Recipe App using Docker and Docker Compose on your OMV server with Portainer.

## Prerequisites

- Docker and Docker Compose installed on your OMV server
- Portainer configured and accessible
- Git to clone the repository (or file transfer method)

## Quick Start

1. **Clone the repository** (or upload files) to your OMV server:
   ```bash
   git clone <repository-url> /path/to/hearth-app
   cd /path/to/hearth-app
   ```

2. **Create environment file**:
   ```bash
   cp .env.production .env
   nano .env
   ```
   
   Update the following variables in `.env`:
   - `POSTGRES_PASSWORD`: Set a secure password
   - `POSTGRES_USER`: Change from default if desired
   - `FRONTEND_PORT`: Port for web interface (default: 7850)
   - `BACKEND_PORT`: Port for API server (default: 7857)

3. **Deploy using Portainer**:
   - Open Portainer web interface
   - Go to "Stacks" → "Add Stack"
   - Name: `hearth-recipe-app`
   - Upload the `docker-compose.yml` file
   - Upload the `.env` file or enter environment variables manually
   - Click "Deploy the stack"

## Manual Docker Compose Deployment

If you prefer command line deployment:

```bash
# Build and start services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Service Architecture

The deployment includes three services:

### 1. Database (`hearth-db`)
- **Image**: postgres:15-alpine
- **Purpose**: Stores recipes, collections, and user data
- **Volume**: `hearth_postgres_data` for data persistence
- **Internal Port**: 5432

### 2. Backend API (`hearth-backend`)
- **Build**: Custom Node.js application
- **Purpose**: REST API server with recipe scraping
- **External Port**: 7857 (configurable via `BACKEND_PORT`)
- **Features**: Puppeteer-based web scraping, Prisma ORM
- **Health Check**: `/api/health` endpoint

### 3. Frontend Web App (`hearth-frontend`)
- **Build**: React app served by Nginx
- **Purpose**: Web interface for managing recipes
- **External Port**: 7850 (configurable via `FRONTEND_PORT`)
- **Features**: SPA routing, API proxy to backend
- **Health Check**: Root endpoint

## Configuration

### Port Configuration

Default ports can be changed in `.env`:
```env
FRONTEND_PORT=7850  # Web interface
BACKEND_PORT=7857   # API server
```

### Database Configuration

```env
POSTGRES_DB=hearth
POSTGRES_USER=hearth_user
POSTGRES_PASSWORD=your_secure_password
```

### Production Optimizations

The configuration includes:
- Health checks for all services
- Proper service dependencies
- Volume mounts for data persistence
- Security headers in Nginx
- Gzip compression
- Cache headers for static assets

## Accessing the Application

After deployment:

- **Web Interface**: `http://your-omv-server-ip:7850`
- **API Health Check**: `http://your-omv-server-ip:7857/api/health`

## Backup and Maintenance

### Database Backup
```bash
# Create backup
docker exec hearth-database pg_dump -U hearth_user hearth > hearth_backup.sql

# Restore backup
docker exec -i hearth-database psql -U hearth_user hearth < hearth_backup.sql
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f hearth-backend
docker-compose logs -f hearth-frontend
docker-compose logs -f hearth-db
```

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Service Won't Start
1. Check logs: `docker-compose logs <service-name>`
2. Verify environment variables in `.env`
3. Ensure ports are not already in use
4. Check disk space and permissions

### Database Connection Issues
1. Wait for database to fully initialize (30-60 seconds)
2. Check database health: `docker-compose exec hearth-db pg_isready -U hearth_user`
3. Verify DATABASE_URL format in logs

### Web Scraping Issues
1. Some sites may block containerized browsers
2. Check backend logs for Puppeteer errors
3. Consider adding user-agent headers if needed

## Security Notes

- Change default passwords in `.env`
- Run behind a reverse proxy (like Nginx Proxy Manager) for HTTPS
- Regularly update Docker images
- Monitor logs for suspicious activity

## Performance Tuning

For better performance on OMV:
- Allocate sufficient RAM (minimum 2GB recommended)
- Use SSD storage for database volume
- Configure Docker log rotation
- Monitor CPU usage during recipe scraping

## Monitoring

Health check endpoints are available:
- Frontend: `http://localhost:7850/health`
- Backend: `http://localhost:7857/api/health`
- Database: Built-in PostgreSQL health checks