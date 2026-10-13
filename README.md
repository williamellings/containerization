# Todo – containeriserad microservice

En enkel todo-app uppdelad i tre containrar: en nginx-frontend, ett Node.js/Express-API och en PostgreSQL-databas. Allt startas med Docker Compose och kan köras lokalt eller på en molnserver.

## Funktioner

- **Tre tjänster:** `web` (nginx), `api` (Node.js) och `db` (PostgreSQL 16)
- **Nätverksisolering:** frontenden kan inte nå databasen, utan bara API:t kan det
- **Skalbart API:** kör flera API-instanser med `--scale`, och nginx fördelar trafiken
- **Ingen container kör som root**
- **Beständig data** i en namngiven Docker-volym
- **Healthchecks** för API och databas
- **Skript för backup och återställning** av databasen

## Arkitektur

```
Internet → web (nginx, :80) → api (Node/Express, skalbar) → db (PostgreSQL)
           [front]            [front + back]                [back, internal]
```

| Tjänst | Image | Nätverk | Kör som |
|---|---|---|---|
| `web` | `nginxinc/nginx-unprivileged` + statisk frontend | `front` | `nginx` |
| `api` | `node:20-alpine` + Express | `front`, `back` | `node` |
| `db` | `postgres:16-alpine` | `back` | `postgres` |

- Nätverket `back` är `internal`, så databasen har ingen väg ut till internet.
- Bara `web` publicerar en port (80). API:t och databasen nås bara inifrån Docker.
- Databasen lagrar sin data i volymen `pgdata`.

## Kom igång

### Krav
- [Docker](https://docs.docker.com/get-docker/) med Docker Compose v2

### Kör lokalt
```bash
git clone https://github.com/williamellings/containerization.git
cd containerization
cp .env.example .env      # ändra värdena, se Konfiguration nedan
docker compose up -d --build
```
Öppna http://localhost.

Stoppa med `docker compose down`. Datan finns kvar i volymen. `docker compose down -v` raderar även databasen.

## Konfiguration

Alla inställningar ligger i `.env` (som inte ska committas):

| Variabel | Beskrivning |
|---|---|
| `DOCKERHUB_USER` | Ditt Docker Hub-användarnamn. Används i image-namnen |
| `POSTGRES_USER` | Databasanvändare |
| `POSTGRES_PASSWORD` | Databaslösenord. Välj ett eget |
| `POSTGRES_DB` | Databasens namn |

## API

| Metod | Sökväg | Beskrivning |
|---|---|---|
| `GET` | `/api/health` | Status, inklusive databasanslutning |
| `GET` | `/api/todos` | Lista alla todos |
| `POST` | `/api/todos` | Skapa en todo. Body: `{ "title": "..." }` |
| `PATCH` | `/api/todos/:id` | Växla klar/inte klar |
| `DELETE` | `/api/todos/:id` | Ta bort en todo |

Varje svar har headern `X-Served-By` med namnet på API-instansen som svarade.

## Skalning

```bash
docker compose up -d --scale api=3
```
Nginx använder Dockers inbyggda DNS och fördelar anropen mellan instanserna. Det fungerar eftersom API:t är stateless: all data ligger i databasen.

## Bygga och publicera images

```bash
docker login
docker compose build
docker compose push
```
Det publicerar `<DOCKERHUB_USER>/todo-api:latest` och `<DOCKERHUB_USER>/todo-web:latest`.

## Driftsätta på en server

Testat på Ubuntu 24.04 i AWS EC2 och Azure VM. Öppna bara port 22 (SSH) och 80 (HTTP) i brandväggen.

```bash
# På servern: installera Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER     # logga ut och in igen efteråt
```

Servern behöver bara `docker-compose.yml` och `.env`, inte källkoden:
```bash
# Från din dator
scp docker-compose.yml .env användare@server-ip:~/

# På servern
docker compose pull
docker compose up -d --no-build
```

Har servern lite minne (till exempel 1 GiB), lägg till swap:
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Backup och återställning

```bash
./scripts/backup.sh                                  # sparar backups/todo-<datum>.sql
./scripts/restore.sh backups/todo-20261011-150314.sql
```

## Projektstruktur

```
.
├── api/                  Node.js/Express-API + Dockerfile
├── web/                  nginx-konfiguration, frontend + Dockerfile
├── scripts/              backup.sh och restore.sh
├── docker-compose.yml
└── .env.example          mall för .env
```
