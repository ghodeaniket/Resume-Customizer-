# Deployment Guide

This guide provides instructions for setting up and deploying the Resume Customizer backend in different environments.

## Docker-Based Deployment (Recommended)

The recommended way to deploy this application is using Docker and Docker Compose, which ensures consistent environments across development and production.

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- AWS account for S3 storage
- Domain name with DNS access (for production)

### Development Deployment

1. Clone the repository and navigate to the project directory

```bash
git clone <repository-url>
cd resume-customizer-backend
```

2. Create a `.env` file by copying `.env.example`

```bash
cp .env.example .env
```

3. Update the `.env` file with your environment variables

4. Start the development environment

```bash
./docker-compose.sh -e dev -a up
```

5. The API will be available at http://localhost:3000/api/v1
6. The API documentation will be available at http://localhost:3000/api-docs
7. Adminer for database management will be available at http://localhost:8080

### Production Deployment

1. Set up a server with Docker and Docker Compose installed

2. Clone the repository and navigate to the project directory

```bash
git clone <repository-url>
cd resume-customizer-backend
```

3. Create a `.env` file by copying `.env.example` and update with production values

```bash
cp .env.example .env
```

4. Create secret files in the `secrets` directory:

```bash
mkdir -p secrets
echo "your-postgres-password" > secrets/postgres_password.txt
# Create other secret files as needed
```

5. Update the Nginx configuration in `nginx/conf/default.conf` with your domain name

6. Start the production environment

```bash
./docker-compose.sh -e prod -a up -d
```

7. Set up SSL certificates with Certbot:

```bash
docker-compose exec certbot certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

8. Set up monitoring:

```bash
./docker-compose.sh -e monitoring -a up -d
```

9. The API will be available at https://yourdomain.com/api/v1
10. Grafana will be available at http://yourdomain.com:3001

### Container Management

The helper script `docker-compose.sh` provides an easy way to manage Docker environments:

```bash
# Start an environment
./docker-compose.sh -e [dev|prod|monitoring] -a up [-d]

# View logs
./docker-compose.sh -e [dev|prod|monitoring] -a logs

# Stop an environment
./docker-compose.sh -e [dev|prod|monitoring] -a down

# Restart an environment
./docker-compose.sh -e [dev|prod|monitoring] -a restart

# Rebuild containers
./docker-compose.sh -e [dev|prod|monitoring] -a build
```

## Manual Deployment (Not Recommended)

If you cannot use Docker for some reason, here's how to deploy manually:

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Nginx (for production)
- PM2 (for process management)

### Development Setup

1. Install Node.js and PostgreSQL
2. Clone the repository and install dependencies

```bash
git clone <repository-url>
cd resume-customizer-backend
npm install
```

3. Create a `.env` file with environment variables
4. Start PostgreSQL and create a database
5. Run migrations and seed data

```bash
npm run db:migrate
npm run db:seed
```

6. Start the development server

```bash
npm run dev
```

### Production Setup

1. Install Node.js, PostgreSQL, Nginx, and PM2
2. Clone the repository and install dependencies

```bash
git clone <repository-url>
cd resume-customizer-backend
npm install --production
```

3. Create a `.env` file with production environment variables
4. Run migrations and seed data

```bash
npm run db:migrate
npm run db:seed
```

5. Set up PM2 to manage the Node.js process

```bash
npm install -g pm2
pm2 start src/app.js --name "resume-customizer-backend" --env production
pm2 save
pm2 startup
```

6. Configure Nginx as a reverse proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/v1/ {
        proxy_pass http://localhost:3000/api/v1/;
        # Add other proxy settings as in the Docker Nginx config
    }

    # Add other locations as needed
}
```

7. Set up SSL with Certbot

```bash
certbot --nginx -d yourdomain.com
```

## CI/CD Pipeline Setup

For automated testing and deployment, consider setting up a CI/CD pipeline:

### GitHub Actions Example

Create a file `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/resume-customizer-backend
            git pull
            ./docker-compose.sh -e prod -a down
            ./docker-compose.sh -e prod -a build
            ./docker-compose.sh -e prod -a up -d
```

## Backup Strategy

Regular backups are essential for production deployments:

### Database Backups

1. Schedule regular PostgreSQL dumps:

```bash
# Add to crontab
0 2 * * * docker exec resume-customizer-postgres pg_dump -U username database > /path/to/backups/db-backup-$(date +\%Y\%m\%d).sql
```

2. Configure backup rotation to keep only recent backups

3. Set up offsite backup storage (e.g., S3, another server)

### Application Backups

1. Back up configuration files and environment variables
2. Consider using Docker volumes for persistent data
3. Document restoration procedures and test them regularly

## Monitoring and Logging

The application includes comprehensive monitoring and logging:

1. Prometheus metrics at `/metrics` endpoint
2. Grafana dashboards for visualization
3. Winston for structured logging
4. Log aggregation with ELK or similar (optional)

## Scaling Considerations

For high-traffic scenarios:

1. Use container orchestration (Kubernetes, Docker Swarm)
2. Implement horizontal scaling of backend containers
3. Set up database replication and connection pooling
4. Use a load balancer in front of multiple app instances
5. Consider implementing caching (Redis, Memcached)

## Environment Variables

Here's a comprehensive list of environment variables used by the application:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development, production) | development |
| `PORT` | Server port | 3000 |
| `DATABASE_URL` | PostgreSQL connection string | |
| `JWT_SECRET` | Secret key for JWT tokens | |
| `JWT_EXPIRES_IN` | JWT token expiration | 7d |
| `AWS_ACCESS_KEY_ID` | AWS access key for S3 | |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for S3 | |
| `AWS_REGION` | AWS region | us-east-1 |
| `AWS_S3_BUCKET` | S3 bucket name | |
| `N8N_WEBHOOK_URL` | URL for n8n webhook | |
| `N8N_API_KEY` | API key for n8n | |
| `LOG_LEVEL` | Logging level | info |
| `PUBLIC_URL` | Public URL for shared resume links | |
