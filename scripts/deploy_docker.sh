#!/bin/bash

# Defaults (can be overridden by args)
SERVER_IP=""
SERVER_USER="root"
APP_DIR="/var/www/rkkland"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

set -euo pipefail

log() {
  echo -e "${GREEN}$1${NC}"
}

err() {
  echo -e "${RED}$1${NC}" 1>&2
}

usage() {
  cat <<EOF
Usage:
  ./scripts/deploy_docker.sh --host <SERVER_IP> [--user <USER>] [--dir <APP_DIR>]

Example:
  ./scripts/deploy_docker.sh --host 85.198.85.239 --user root --dir /var/www/rkkland

Notes:
  - On server, the folder must contain .env and .env.docker (see DEPLOY.md)
  - docker-compose.yml maps 3000:3000
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      SERVER_IP="${2:-}"; shift 2 ;;
    --user)
      SERVER_USER="${2:-}"; shift 2 ;;
    --dir)
      APP_DIR="${2:-}"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      err "Unknown argument: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "${SERVER_IP}" ]]; then
  err "Missing required --host"
  usage
  exit 1
fi

log "Starting Docker deployment to ${SERVER_IP}..."

# 1. Ensure Docker + Compose plugin are installed
log "Ensuring Docker is installed on server..."
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${SERVER_USER}@${SERVER_IP} "
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
  mkdir -p ${APP_DIR}
"

# 2. Upload files
log "Uploading project files to ${APP_DIR}..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.docker' \
  --exclude 'infra/supabase/docker/volumes' \
  ./ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}

# 3. Ensure env files exist on server
log "Checking .env and .env.docker on server..."
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${SERVER_USER}@${SERVER_IP} "
  set -e
  cd ${APP_DIR}

  if [ ! -f .env ]; then
    echo 'Missing .env (needed for build args NEXT_PUBLIC_*). Create it before deploy.'
    exit 2
  fi

  if [ ! -f .env.docker ]; then
    echo 'Missing .env.docker (runtime env). Create it before deploy.'
    exit 2
  fi
"

# 4. Build and run
log "Building and starting container..."
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${SERVER_USER}@${SERVER_IP} "
  set -e
  cd ${APP_DIR}
  docker compose up -d --build
  docker compose ps
"

log "Deployment complete."
log "If you use nginx, it should proxy to http://localhost:3000 (compose maps 3000:3000)."
