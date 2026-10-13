# Todo – containerized microservice

A simple todo app split into three containers: an nginx frontend, a Node.js/Express API and a PostgreSQL database. Everything starts with Docker Compose and runs locally or on a cloud server.

## Features

- **Three services:** `web` (nginx), `api` (Node.js) and `db` (PostgreSQL 16)
- **Network isolation:** the frontend cannot reach the database; only the API can
- **Scalable API:** run several API instances with `--scale`, and nginx spreads the traffic
- **No container runs as root**
- **Persistent data** in a named Docker volume
- **Healthchecks** for the API and the database
- **Backup and restore scripts** for the database

## Architecture

```
Internet → web (nginx, :80) → api (Node/Express, scalable) → db (PostgreSQL)
           [front]            [front + back]                 [back, internal]
```

| Service | Image | Networks | Runs as |
|---|---|---|---|
| `web` | `nginxinc/nginx-unprivileged` + static frontend | `front` | `nginx` |
| `api` | `node:20-alpine` + Express | `front`, `back` | `node` |
| `db` | `postgres:16-alpine` | `back` | `postgres` |

- The `back` network is `internal`, so the database has no route to the internet.
- Only `web` publishes a port (80). The API and the database are reachable only from inside Docker.
- The database stores its data in the `pgdata` volume.

## Getting started

### Requirements
- [Docker](https://docs.docker.com/get-docker/) with Docker Compose v2

### Run locally
```bash
git clone https://github.com/williamellings/containerization.git
cd containerization
cp .env.example .env      # change the values, see Configuration below
docker compose up -d --build
```
Open http://localhost.

Stop with `docker compose down`. Your data stays in the volume. `docker compose down -v` also deletes the database.

## Configuration

All settings live in `.env` (do not commit it):

| Variable | Description |
|---|---|
| `DOCKERHUB_USER` | Your Docker Hub username. Used in the image names |
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password. Choose your own |
| `POSTGRES_DB` | Database name |

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Status, including the database connection |
| `GET` | `/api/todos` | List all todos |
| `POST` | `/api/todos` | Create a todo. Body: `{ "title": "..." }` |
| `PATCH` | `/api/todos/:id` | Toggle done/not done |
| `DELETE` | `/api/todos/:id` | Delete a todo |

Every response has an `X-Served-By` header with the name of the API instance that answered.

## Scaling

```bash
docker compose up -d --scale api=3
```
Nginx uses Docker's built-in DNS to spread requests across the instances. This works because the API is stateless: all data lives in the database.

## Building and publishing images

```bash
docker login
docker compose build
docker compose push
```
This publishes `<DOCKERHUB_USER>/todo-api:latest` and `<DOCKERHUB_USER>/todo-web:latest`.

## Deploying to a server

Tested on Ubuntu 24.04 on AWS EC2 and Azure VM. Open only port 22 (SSH) and port 80 (HTTP) in the firewall.

```bash
# On the server: install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER     # log out and back in afterwards
```

The server only needs `docker-compose.yml` and `.env`, not the source code:
```bash
# From your machine
scp docker-compose.yml .env user@server-ip:~/

# On the server
docker compose pull
docker compose up -d --no-build
```

If the server has little memory (for example 1 GiB), add swap:
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Backup and restore

```bash
./scripts/backup.sh                                  # saves backups/todo-<date>.sql
./scripts/restore.sh backups/todo-20261011-150314.sql
```

## Project structure

```
.
├── api/                  Node.js/Express API + Dockerfile
├── web/                  nginx config, frontend + Dockerfile
├── scripts/              backup.sh and restore.sh
├── docker-compose.yml
└── .env.example          template for .env
```
