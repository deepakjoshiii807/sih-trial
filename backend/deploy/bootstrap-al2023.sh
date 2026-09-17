#!/usr/bin/env bash
#
# One-shot provisioning for the SkillBridge / AIIA Django API on Amazon Linux 2023.
#
#   Run it from the backend/ directory, on the instance:
#     bash deploy/bootstrap-al2023.sh
#
#   Optional overrides (env vars):
#     REPO_URL, APP_DIR, CERT_EMAIL, FRONTEND_ORIGINS, FIREBASE_PROJECT_ID
#
# Idempotent — safe to re-run. It will not overwrite an existing .env (so your
# secrets survive), will not re-request an existing certificate, and re-running
# it is the standard way to deploy new code.
#
# Steps: derive hostname -> install docker/nginx/certbot -> clone or update ->
# write .env -> build & start Postgres+gunicorn -> wait for health -> nginx ->
# Let's Encrypt -> enable TLS -> print the VITE_API_URL.
#
# Manual equivalent and troubleshooting: deploy/AWS-AL2023.md
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/deepakjoshiii807/sih-trial.git}"
APP_DIR="${APP_DIR:-$HOME/sih-trial}"
CERT_EMAIL="${CERT_EMAIL:-}"
FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-learntoleadd}"
FRONTEND_ORIGINS="${FRONTEND_ORIGINS:-https://5173-a68b6e90-f41e-4a15-bb41-f4e2999832a5.daytonaproxy01.net}"

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[1;31mxx %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -ne 0 ] || die "Run this as your normal user (it calls sudo itself), not as root."

# --------------------------------------------------------------------------
# 1. Hostname — sslip.io maps 13-234-56-78.sslip.io back to that IP, which
#    gives us a real certificate without owning a domain. AL2023 enforces
#    IMDSv2, so the classic one-liner GET returns 401.
# --------------------------------------------------------------------------
log "Deriving the public hostname"
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 300") \
  || die "Could not reach the EC2 metadata service."
IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4) \
  || die "Could not read the public IP. Is the instance behind a NAT gateway?"
[ -n "$IP" ] || die "Instance has no public IPv4 — attach an Elastic IP first."
HOST="$(echo "$IP" | tr '.' '-').sslip.io"
echo "    IP:   $IP"
echo "    HOST: $HOST"
getent hosts "$HOST" >/dev/null 2>&1 || die "$HOST does not resolve. Check DNS / the Elastic IP."

# --------------------------------------------------------------------------
# 2. Packages
# --------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker"
  sudo dnf install -y docker
fi
sudo systemctl enable --now docker >/dev/null

if ! sudo docker compose version >/dev/null 2>&1; then
  log "Installing the Compose plugin (system-wide, so sudo can see it too)"
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64)  BIN=linux-x86_64 ;;
    aarch64) BIN=linux-aarch64 ;;
    *) die "Unsupported architecture: $ARCH" ;;
  esac
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-$BIN" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi
sudo docker compose version | head -n 1

if ! command -v nginx >/dev/null 2>&1; then
  log "Installing nginx"
  sudo dnf install -y nginx
fi
sudo systemctl enable --now nginx >/dev/null

HAVE_CERTBOT=1
command -v certbot >/dev/null 2>&1 || {
  log "Installing certbot"
  sudo dnf install -y certbot || HAVE_CERTBOT=0
}
[ "$HAVE_CERTBOT" = "1" ] || warn "certbot is not available from dnf — will use the Docker image instead."

# --------------------------------------------------------------------------
# 3. Code
# --------------------------------------------------------------------------
if [ -d "$APP_DIR/.git" ]; then
  log "Updating the existing checkout"
  git -C "$APP_DIR" pull --ff-only || warn "git pull failed — deploying the current working tree as-is."
else
  log "Cloning $REPO_URL"
  git clone "$REPO_URL" "$APP_DIR" || die "Clone failed. If the repo is private, authenticate on this box first (gh auth login)."
fi
cd "$APP_DIR/backend"

# --------------------------------------------------------------------------
# 4. Environment — secrets are read without echo and never leave the box.
# --------------------------------------------------------------------------
prompt_secret() { # prompt_secret VAR "Label"
  local __var="$1" __label="$2" __value=""
  while [ -z "$__value" ]; do
    read -rsp "    $__label: " __value </dev/tty
    printf '\n'
    [ -n "$__value" ] || warn "Value cannot be empty."
  done
  printf -v "$__var" '%s' "$__value"
}

if [ -f .env ]; then
  log "Keeping the existing .env (delete it to re-enter values)"
else
  log "Collecting deployment values (input is hidden)"
  prompt_secret POSTGRES_PASSWORD      "New Postgres password"
  prompt_secret DEMO_PASSWORD          "Demo seed password"
  prompt_secret VLY_INTEGRATION_KEY    "VLY_INTEGRATION_KEY (from the project's Keys tab)"
  if [ -z "$CERT_EMAIL" ]; then
    read -rp "    Let's Encrypt contact email: " CERT_EMAIL </dev/tty
  fi
  [ -n "$CERT_EMAIL" ] || die "A contact email is required for the certificate."

  log "Writing backend/.env (mode 600, git-ignored, not copied into the image)"
  ( umask 077; cat > .env <<EOF
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
DEBUG=False
DJANGO_ALLOWED_HOSTS=$HOST,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=https://$HOST
SECURE_SSL_REDIRECT=True

CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=$FRONTEND_ORIGINS

POSTGRES_DB=skillbridge
POSTGRES_USER=skillbridge
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

SEED_DEMO=1
DEMO_PASSWORD=$DEMO_PASSWORD

FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
VLY_INTEGRATION_KEY=$VLY_INTEGRATION_KEY

WEB_CONCURRENCY=2
WEB_THREADS=2
EOF
  )
  chmod 600 .env
fi

# --------------------------------------------------------------------------
# 5. Bring up Postgres + gunicorn
# --------------------------------------------------------------------------
log "Building and starting the stack (entrypoint runs migrate + seed_demo)"
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

log "Waiting for /api/health"
HEALTHY=0
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8000/api/health 2>/dev/null | grep -q '"status":* *"ok"'; then
    HEALTHY=1
    break
  fi
  sleep 2
done
if [ "$HEALTHY" != "1" ]; then
  sudo docker compose logs --tail 40 web >&2 || true
  die "The API never reported healthy. Fix this before continuing — nginx cannot help a dead container."
fi
echo "    $(curl -fsS http://127.0.0.1:8000/api/health)"

# --------------------------------------------------------------------------
# 6. nginx — HTTP first so the ACME challenge can be served
# --------------------------------------------------------------------------
log "Installing the nginx site config"
sudo sed "s/__API_HOST__/$HOST/g" deploy/nginx/l2l-api-http.conf \
  | sudo tee /etc/nginx/conf.d/l2l-api.conf >/dev/null
sudo nginx -t
sudo systemctl reload nginx
curl -fsS "http://$HOST/api/health" >/dev/null || die "nginx is not proxying to the API."
echo "    http://$HOST/api/health -> ok"

# --------------------------------------------------------------------------
# 7. Certificate (skipped when one already exists)
# --------------------------------------------------------------------------
if sudo test -f "/etc/letsencrypt/live/$HOST/fullchain.pem"; then
  log "Certificate already present — skipping issuance"
else
  log "Requesting a Let's Encrypt certificate for $HOST"
  if [ "$HAVE_CERTBOT" = "1" ]; then
    sudo certbot certonly --webroot -w /usr/share/nginx/html \
      -d "$HOST" --agree-tos -m "$CERT_EMAIL" --non-interactive \
      || die "Certificate issuance failed. Port 80 must be open and $HOST must resolve here."
  else
    sudo docker run --rm \
      -v /etc/letsencrypt:/etc/letsencrypt \
      -v /usr/share/nginx/html:/usr/share/nginx/html \
      certbot/certbot certonly --webroot -w /usr/share/nginx/html \
      -d "$HOST" --agree-tos -m "$CERT_EMAIL" --non-interactive \
      || die "Certificate issuance failed. Port 80 must be open and $HOST must resolve here."
  fi
fi

# --------------------------------------------------------------------------
# 8. Enable TLS
# --------------------------------------------------------------------------
log "Switching nginx to TLS"
sudo sed "s/__API_HOST__/$HOST/g" deploy/nginx/l2l-api-https.conf \
  | sudo tee /etc/nginx/conf.d/l2l-api.conf >/dev/null
sudo nginx -t
sudo systemctl reload nginx

curl -fsS "https://$HOST/api/health" >/dev/null || die "HTTPS health check failed — check /var/log/nginx/error.log."
echo "    https://$HOST/api/health -> ok"

cat <<EOF

$(printf '\033[1;32m')Deployment complete.$(printf '\033[0m')

    API           https://$HOST/api
    Health        https://$HOST/api/health
    Admin         https://$HOST/admin/

Next, in the project environment (both sandbox and production):

    VITE_API_URL=https://$HOST/api

The frontend must then be REDEPLOYED — Vite inlines env vars at build time, so
the value does nothing until it rebuilds.

Also add your deployed frontend's domain to Firebase:
    Authentication -> Settings -> Authorized domains
(Google sign-in refuses origins that are not listed; email/password does not.)

Ops:
    cd $APP_DIR/backend
    sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f web
    sudo docker compose exec web python manage.py createsuperuser
    sudo docker compose exec -T db pg_dump -U skillbridge skillbridge > ~/backup-\$(date +%F).sql
EOF
