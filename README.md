# Todo – containerized microservice (VG)

```
Internet → web (nginx, :80) → api (Node/Express, skalbar) → db (PostgreSQL + volym pgdata)
           [front]            [front + back]                [back, internal]
```

| Krav | Lösning |
|---|---|
| 2 egna images | `api/Dockerfile`, `web/Dockerfile` |
| Docker Hub | `docker push` (se nedan) |
| Ingen root | api: `USER node`, web: `nginx-unprivileged`, db: `user: postgres` |
| 3 containrar + PostgreSQL | web, api, db |
| Namngiven volym | `pgdata` |
| Nätverksisolering | `web` är bara på `front`, `db` bara på `back` (internal). web når alltså inte db |
| Skalning | `docker compose up -d --scale api=3` (nginx lastbalanserar via Docker DNS) |
| Extra | healthchecks, backup/restore-skript |

## 1. Lokalt (kräver Docker Desktop)
```bash
cp .env.example .env     # fyll i DOCKERHUB_USER och lösenord
docker compose up -d --build
# öppna http://localhost
```

## 2. Bygg och pusha till Docker Hub
```bash
docker login
docker compose build
docker compose push
```
Detta ger `<user>/todo-api:latest` och `<user>/todo-web:latest`.

## 3. Driftsätt på AWS EC2 (Ubuntu 24.04, t2/t3.micro)
Security group: öppna port 22 (SSH) och 80 (HTTP). Port 5432 ska INTE vara öppen.

```bash
ssh -i nyckel.pem ubuntu@<EC2-IP>

# Installera Docker + Compose
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && exit     # logga in igen

# På servern behövs bara compose-filen och .env (inte källkoden)
mkdir todo && cd todo
# kopiera docker-compose.yml och .env hit (scp eller nano)
docker compose pull
docker compose up -d
docker compose ps
```
Öppna `http://<EC2-IP>`.

Obs: på servern bygger du inte, du hämtar images från Docker Hub. Ta gärna bort raderna `build:` ur compose-filen där, eller kör bara `pull` + `up --no-build`.

## 4. VG-demo till screencasten
```bash
docker compose ps                           # 3 containrar, healthy
docker compose up -d --scale api=3 --no-build
docker compose ps                           # api-1, api-2, api-3
curl -si localhost/api/todos | grep -i x-served-by   # kör flera gånger, olika instans
docker compose exec web sh -c "nc -zv db 5432"       # ska misslyckas (isolering)
docker compose exec api sh -c "nc -zv db 5432"       # ska lyckas
docker compose exec api whoami                       # node (inte root)
docker volume ls                                     # <projekt>_pgdata
./scripts/backup.sh
docker compose down && docker compose up -d          # data finns kvar
```

## Screencast-checklista (3–10 min)
- [ ] Docker Hub: visa en av images
- [ ] EC2: `docker compose ps` + appen i webbläsaren
- [ ] VG: nätverk, volym, scale, root-fritt, healthchecks, backup
