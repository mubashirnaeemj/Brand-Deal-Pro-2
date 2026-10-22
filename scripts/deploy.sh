#!/usr/bin/env bash
# Deploys the latest code on the production server: pull, install, build, restart.
# Run on the server (the GitHub workflow does this over SSH):  bash scripts/deploy.sh
#
# Everything is inside main() so that bash has read the whole script before it runs.
# That makes it safe for `git reset` to replace this very file halfway through.
set -Eeuo pipefail

main() {
  local APP_DIR="${APP_DIR:-/opt/Brand-Deal-Pro-2}"
  local BRANCH="${BRANCH:-main}"
  local SERVICE="${SERVICE:-mavlit-frontend}"
  local API_PORT="${API_PORT:-8090}"

  # systemd and ssh sessions do not load nvm; Node lives here on this server.
  export PATH="/opt/nodejs/bin:$PATH"
  export CI=true

  # One deploy at a time.
  exec 9>/tmp/brand-deal-pro-deploy.lock
  flock -n 9 || { echo "Another deploy is already running."; exit 1; }

  cd "$APP_DIR"
  echo "==> Pulling $BRANCH"
  git fetch --prune origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
  echo "    now at $(git log --oneline -1)"

  if ! command -v pnpm >/dev/null; then
    echo "==> Enabling pnpm"
    corepack enable
  fi

  echo "==> Installing dependencies"
  pnpm install --frozen-lockfile

  # Build the frontend beside the live folder and swap it in only if the build worked,
  # so a failed build never leaves the site empty.
  echo "==> Building the frontend"
  local PUBLIC="$APP_DIR/artifacts/mavlit/dist/public"
  local STAGE="$APP_DIR/artifacts/mavlit/dist/public.new"
  rm -rf "$STAGE"
  (cd artifacts/mavlit && PORT=3000 BASE_PATH=/ node_modules/.bin/vite build --config vite.config.ts --outDir "$STAGE" --emptyOutDir)
  [ -f "$STAGE/index.html" ] || { echo "Frontend build produced no index.html"; exit 1; }
  rm -rf "$PUBLIC.old"
  [ -d "$PUBLIC" ] && mv "$PUBLIC" "$PUBLIC.old"
  mv "$STAGE" "$PUBLIC"
  rm -rf "$PUBLIC.old"

  echo "==> Building the API server"
  (cd artifacts/api-server && node ./build.mjs)
  [ -f artifacts/api-server/dist/index.mjs ] || { echo "API build produced no dist/index.mjs"; exit 1; }

  echo "==> Restarting $SERVICE"
  systemctl restart "$SERVICE"

  echo "==> Waiting for the API to answer on port $API_PORT"
  for _ in $(seq 1 20); do
    if curl -fsS "http://127.0.0.1:$API_PORT/api/healthz" >/dev/null 2>&1; then
      echo "==> Deployed $(git log --oneline -1)"
      return 0
    fi
    sleep 1
  done
  echo "The API did not come back after the restart. Recent log:"
  journalctl -u "$SERVICE" -n 30 --no-pager || true
  exit 1
}

main "$@"
exit $?
