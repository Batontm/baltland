#!/bin/bash

set -euo pipefail

# Configuration
SERVER_IP="85.198.85.239"
SERVER_USER="root"
APP_DIR="/var/www/rkkland"

WITH_SEED="false"
SEED_DIR="seed_export"

for arg in "$@"; do
  case "$arg" in
    --with-seed)
      WITH_SEED="true" ;;
    *)
      echo "Unknown argument: $arg" 1>&2
      exit 1 ;;
  esac
done

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Starting deployment of Baltland.ru to $SERVER_IP...${NC}"

if [ "$WITH_SEED" = "true" ]; then
  echo -e "${GREEN}Seed mode enabled: will export data from local Supabase and import into VPS.${NC}"
fi

# 1. Ensure Docker + Compose plugin are installed
echo -e "${GREEN}Ensuring Docker is installed on server...${NC}"
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SERVER_USER@$SERVER_IP "
  set -e
  if ! command -v docker >/dev/null 2>&1; then
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \"deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \$(. /etc/os-release && echo \$VERSION_CODENAME) stable\" > /etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
  mkdir -p $APP_DIR
"

# 2. Upload Files
echo -e "${GREEN}Uploading files...${NC}"
# Exclude heavy/unnecessary files and environment configs
rsync -avz -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.docker' \
  --exclude 'infra/supabase/docker/volumes/***' \
  ./ $SERVER_USER@$SERVER_IP:$APP_DIR

if [ "$WITH_SEED" = "true" ]; then
  echo -e "${GREEN}Exporting seed from local Supabase...${NC}"

  if ! curl -fsS "http://localhost:8000/rest/v1/" >/dev/null 2>&1; then
    echo "Local Supabase is not reachable at http://localhost:8000. Start it first (infra/supabase/docker)." 1>&2
    exit 3
  fi

  if [ ! -f "infra/supabase/docker/.env" ]; then
    echo "Missing infra/supabase/docker/.env locally (need SERVICE_ROLE_KEY for export)." 1>&2
    exit 3
  fi

  LOCAL_SERVICE_ROLE_KEY=$(grep "^SERVICE_ROLE_KEY=" infra/supabase/docker/.env | head -n1 | cut -d= -f2-)
  if [ -z "${LOCAL_SERVICE_ROLE_KEY}" ]; then
    echo "SERVICE_ROLE_KEY not found in infra/supabase/docker/.env" 1>&2
    exit 3
  fi

  mkdir -p "$SEED_DIR"

  docker run --rm -i \
    -v "$PWD/$SEED_DIR:/out" \
    curlimages/curl:8.5.0 sh -lc "
set -e

SUPABASE_URL='http://host.docker.internal:8000'
KEY='${LOCAL_SERVICE_ROLE_KEY}'
OUT='/out'

TABLES='land_plots land_plot_images organization_settings leads subscribers news commercial_proposals commercial_proposal_plots landing_benefits_section landing_benefit_items settlement_descriptions faq_items legal_content chat_sessions chat_messages admin_users users import_logs kladr_places kladr_streets plot_placeholders rate_limit_events'

for t in \$TABLES; do
  echo \"Exporting \$t...\"
  curl -fsS \"\$SUPABASE_URL/rest/v1/\$t?select=*\" \
    -H \"apikey: \$KEY\" \
    -H \"Authorization: Bearer \$KEY\" \
    -o \"\$OUT/\$t.json\"
done

echo 'Export complete.'
ls -la \"\$OUT\"
"

  echo -e "${GREEN}Packing local Supabase storage volume (storage-data)...${NC}"
  LOCAL_STORAGE_VOL="supabase_storage-data"
  if ! docker volume inspect "$LOCAL_STORAGE_VOL" >/dev/null 2>&1; then
    echo "Local docker volume $LOCAL_STORAGE_VOL not found. Make sure local Supabase stack has been started at least once." 1>&2
    exit 3
  fi

  docker run --rm \
    -v "$LOCAL_STORAGE_VOL:/data" \
    -v "$PWD/$SEED_DIR:/out" \
    alpine:3.19 sh -lc 'cd /data && tar czf /out/storage-data.tgz .'

  echo -e "${GREEN}Uploading seed_export to server...${NC}"
  rsync -avz -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
    "$SEED_DIR/" $SERVER_USER@$SERVER_IP:$APP_DIR/$SEED_DIR/
fi

# 3. Ensure env files exist on server
echo -e "${GREEN}Checking env files on server...${NC}"
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SERVER_USER@$SERVER_IP "
  set -e
  cd $APP_DIR
  if [ ! -f .env ]; then
    echo 'Missing .env (needed for build args NEXT_PUBLIC_*). Create it before deploy.'
    exit 2
  fi
  if [ ! -f .env.docker ]; then
    echo 'Missing .env.docker (runtime env). Create it before deploy.'
    exit 2
  fi
"

if [ "$WITH_SEED" = "true" ]; then
  # 4. Start Supabase
  echo -e "${GREEN}Starting Supabase (self-hosted) via Docker Compose...${NC}"
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SERVER_USER@$SERVER_IP "
    set -e
    cd $APP_DIR/infra/supabase/docker
    if [ ! -f .env ]; then
      echo 'Missing infra/supabase/docker/.env (Supabase self-hosted env). Create it before deploy.'
      exit 2
    fi
    docker compose up -d
    docker compose ps
  "
fi

if [ "$WITH_SEED" = "true" ]; then
  echo -e "${GREEN}Restoring Supabase storage volume on server...${NC}"
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SERVER_USER@$SERVER_IP "
    set -e
    cd $APP_DIR
    if [ ! -f $SEED_DIR/storage-data.tgz ]; then
      echo 'Missing seed_export/storage-data.tgz on server.'
      exit 4
    fi
    docker volume inspect supabase_storage-data >/dev/null 2>&1
    docker run --rm \
      -v supabase_storage-data:/data \
      -v $APP_DIR/$SEED_DIR:/in \
      alpine:3.19 sh -lc \"rm -rf /data/* && tar xzf /in/storage-data.tgz -C /data\"
  "
fi

if [ "$WITH_SEED" = "true" ]; then
  # 5. Apply SQL migrations to Postgres
  echo -e "${GREEN}Applying SQL migrations to Supabase Postgres...${NC}"
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SERVER_USER@$SERVER_IP "
    set -e
    cd $APP_DIR
    (ls -1 scripts/*.sql 2>/dev/null | grep -v '014-clear-land-plots.sql' || true; ls -1 migrations/*.sql 2>/dev/null; ls -1 supabase/migrations/*.sql 2>/dev/null) \
      | while read f; do echo \"-- FILE: $f\"; cat \"$f\"; echo; done \
      | docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1
  "
fi

# 6. Build and start web
echo -e "${GREEN}Building and starting web container...${NC}"
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SERVER_USER@$SERVER_IP "
  set -e
  cd $APP_DIR
  docker compose up -d --build web
  docker compose ps
"

if [ "$WITH_SEED" = "true" ]; then
  echo -e "${GREEN}Importing seed JSON into server Supabase via Kong...${NC}"
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SERVER_USER@$SERVER_IP "
    set -e
    cd $APP_DIR

    SERVICE_ROLE_KEY=\$(grep '^SERVICE_ROLE_KEY=' infra/supabase/docker/.env | head -n1 | cut -d= -f2-)
    if [ -z \"\$SERVICE_ROLE_KEY\" ]; then
      echo 'SERVICE_ROLE_KEY not found in infra/supabase/docker/.env on server.'
      exit 5
    fi

    if [ ! -d $SEED_DIR ]; then
      echo 'Missing seed_export directory on server.'
      exit 5
    fi

    docker run --rm -v $APP_DIR/$SEED_DIR:/seed curlimages/curl:8.5.0 sh -lc \"
set -e

BASE='http://host.docker.internal:8000/rest/v1'
KEY='\$SERVICE_ROLE_KEY'

for f in /seed/*.json; do
  t=\$(basename \$f .json)
  echo Importing \$t ...
  curl -fsS -X POST \"\$BASE/\$t\" \
    -H \"apikey: \$KEY\" \
    -H \"Authorization: Bearer \$KEY\" \
    -H \"Content-Type: application/json\" \
    -H \"Prefer: resolution=merge-duplicates,return=minimal\" \
    --data-binary @\"\$f\" >/dev/null
done

echo 'Import complete.'
\"
  "
fi

echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}App should be available at http://$SERVER_IP:3000 (or via nginx/ssl on baltland.ru)${NC}"
