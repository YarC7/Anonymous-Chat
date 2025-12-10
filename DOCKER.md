# Anonymous Chat - Docker Deployment

## Quick Start

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production Deployment

1. **Configure environment variables**

   ```bash
   cp .env.production .env
   # Edit .env with your production values
   ```

2. **Build and start services**

   ```bash
   docker-compose up -d --build
   ```

3. **Run database migrations**

   ```bash
   docker-compose exec app pnpm knex migrate:latest
   ```

4. **Check service health**
   ```bash
   docker-compose ps
   docker-compose logs app
   ```

## Services

- **app**: Node.js application (port 8080)
- **postgres**: PostgreSQL database (port 5432)
- **redis**: Redis cache (port 6379)

## Volumes

- `postgres_data`: PostgreSQL data persistence
- `redis_data`: Redis data persistence

## Environment Variables

Required variables in `.env` file:

```env
DATABASE_NAME=anonymous_chat
DATABASE_USER=postgres
DATABASE_PASSWORD=secure_password
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
SESSION_SECRET=your_secret
```

## CI/CD Pipeline

The GitHub Actions workflow automatically:

1. Runs tests on push/PR
2. Builds Docker image on main branch
3. Pushes to GitHub Container Registry
4. Deploys to production (configure SSH in workflow)

## Backup & Restore

### Backup database

```bash
docker-compose exec postgres pg_dump -U postgres anonymous_chat > backup.sql
```

### Restore database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres anonymous_chat
```

## Monitoring

```bash
# View resource usage
docker stats

# View app logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres
```

## Troubleshooting

### Reset everything

```bash
docker-compose down -v
docker-compose up -d --build
docker-compose exec app pnpm knex migrate:latest
```

### Database connection issues

```bash
# Check if PostgreSQL is healthy
docker-compose ps postgres

# Check logs
docker-compose logs postgres
```
