# Deploying the API on AWS (Amazon Linux 2023 + Docker Compose)

Single-box deployment: gunicorn + Postgres in Docker, nginx on the host
terminating TLS, with a free `sslip.io` hostname instead of a registered domain.

```
internet ──▶ nginx (host, :443, Let's Encrypt TLS)
               └──▶ 127.0.0.1:8000  docker: web (gunicorn + Django)
                                        └──▶ docker: db (Postgres 16, volume)
```

Everything here is copy-paste. Run the steps **in order** — each one ends with a
check, and stopping at the first failure is much faster than debugging the whole
stack at once.

---

## 0. Before you start (AWS console)

1. **Elastic IP** — allocate one and associate it with the instance. Without it,
   the public IP changes when the instance restarts, which breaks both the
   certificate and `VITE_API_URL`.
2. **Security group — inbound:**

   | Port | Source | Why |
   |---|---|---|
   | 22 | *your IP* | SSH |
   | 80 | `0.0.0.0/0` | Let's Encrypt HTTP-01 validation + the redirect to HTTPS |
   | 443 | `0.0.0.0/0` | the API |

   **Do not open 8000.** The prod compose override binds the API to loopback so
   gunicorn is never reachable directly.
3. The repo must be cloned on the box — the runbook uses
   `https://github.com/deepakjoshiii807/sih-trial.git`. If it's private,
   authenticate on the instance first (`gh auth login`).

---

## 1. Work out your hostname

`sslip.io` maps `<ip-with-dashes>.sslip.io` back to that IP, so you get a real
hostname (and a real certificate) with no domain purchase.

```bash
# AL2023 requires IMDSv2, so fetch a metadata token first.
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4)
HOST="$(echo "$IP" | tr '.' '-').sslip.io"
echo "$HOST"

# Verify it resolves back to your Elastic IP before going further.
getent hosts "$HOST"
```

Keep that shell open — `$HOST` is used by every later step. (If you reconnect,
re-derive it or just export it again by hand, e.g. `export HOST=13-234-56-78.sslip.io`.)

---

## 2. Docker + the Compose plugin

```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
newgrp docker          # or log out and back in

# Compose plugin — pick the binary that matches the instance architecture
# (t4g/m6g/m7g instances are aarch64, most others are x86_64).
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  C=linux-x86_64 ;;
  aarch64) C=linux-aarch64 ;;
  *) echo "Unsupported arch: $ARCH" >&2; exit 1 ;;
esac
# Install system-wide (/usr/local/lib/docker/cli-plugins) rather than in
# ~/.docker/cli-plugins: the per-user location is invisible to root, so
# `sudo docker compose` would fail until you have logged back in for the
# docker group. System-wide works for both immediately.
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-$C" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```

**Check:**
```bash
docker run --rm hello-world | tail -n 2
docker compose version     # must be v2.24 or newer (the prod override uses !override)
```

If `docker compose` reports a permission error, your shell hasn't picked up the
`docker` group yet — either run `newgrp docker`, log out and back in, or prefix
the compose commands below with `sudo` (which works because the plugin is
installed system-wide).

---

## 3. Clone

```bash
cd "$HOME"
git clone https://github.com/deepakjoshiii807/sih-trial.git
cd sih-trial/backend
```

---

## 4. Create `backend/.env`

Compose loads `.env` from the compose file's directory and interpolates
`docker-compose.yml` with it. This file holds secrets — it is already in
`.gitignore` and `.dockerignore`, so it never gets committed or baked into the
image. Replace every `<...>` value.

```bash
cat > .env <<EOF
# ---- Django ---------------------------------------------------------------
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
DEBUG=False
DJANGO_ALLOWED_HOSTS=$HOST,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=https://$HOST
SECURE_SSL_REDIRECT=True

# ---- CORS: every origin the browser loads the app from --------------------
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://5173-a68b6e90-f41e-4a15-bb41-f4e2999832a5.daytonaproxy01.net

# ---- Postgres (compose builds DATABASE_URL from these) --------------------
POSTGRES_DB=skillbridge
POSTGRES_USER=skillbridge
POSTGRES_PASSWORD=<pick-a-long-random-password>

# ---- Demo data ------------------------------------------------------------
SEED_DEMO=1
DEMO_PASSWORD=<a-demo-password-you-choose>

# ---- Auth: Firebase (token verification needs only the project id) --------
FIREBASE_PROJECT_ID=learntoleadd

# ---- AI gateway key — copy from the project's Keys tab --------------------
VLY_INTEGRATION_KEY=<paste-from-keys-tab>

# ---- gunicorn -------------------------------------------------------------
WEB_CONCURRENCY=2
WEB_THREADS=2
EOF
chmod 600 .env
```

Two notes:

- **`CORS_ALLOWED_ORIGINS` must list every frontend origin** the app is served
  from — the preview origin above *and* your deployed frontend domain once you
  have it. A missing origin shows up in the browser as a CORS error and looks
  like the API is down.
- Leave `DATABASE_URL` unset. `docker-compose.yml` sets it for the container
  from the `POSTGRES_*` values; setting it here would override that.

---

## 5. Start the stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose ps
docker compose logs -f web     # Ctrl-C once you see gunicorn boot
```

`entrypoint.sh` waits for Postgres, runs `migrate` (including
`accounts.0003_user_firebase_uid`), seeds demo data when `SEED_DEMO=1`, collects
static files, then execs gunicorn.

**Check** — health should report the database as ok:
```bash
curl -s http://127.0.0.1:8000/api/health
# {"status": "ok", "database": "ok"}
```

If that fails, stop here and fix it (see Troubleshooting) — nginx can't help.

---

## 6. nginx

```bash
sudo dnf install -y nginx
sudo systemctl enable --now nginx

# Bootstrap config: HTTP + the ACME challenge path, with __API_HOST__ filled in.
sudo sed "s/__API_HOST__/$HOST/g" deploy/nginx/l2l-api-http.conf \
  | sudo tee /etc/nginx/conf.d/l2l-api.conf > /dev/null

sudo nginx -t && sudo systemctl reload nginx

curl -s "http://$HOST/api/health"    # {"status": "ok", "database": "ok"}
```

---

## 7. Certificate

```bash
sudo dnf install -y certbot
sudo certbot certonly --webroot -w /usr/share/nginx/html \
  -d "$HOST" --agree-tos -m <your-email> --non-interactive
```

The webroot is nginx's default document root on purpose: a custom path under
`/var/www` would be blocked by AL2023's enforcing SELinux policy.

If `certbot` isn't in your AL2023 repos, the Docker image works identically:
```bash
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /usr/share/nginx/html:/usr/share/nginx/html \
  certbot/certbot certonly --webroot -w /usr/share/nginx/html \
  -d "$HOST" --agree-tos -m <your-email> --non-interactive
```

**Check:**
```bash
sudo ls /etc/letsencrypt/live/$HOST/fullchain.pem
```

Renewals: the `certbot` package installs a systemd timer (`systemctl list-timers | grep certbot`)
and the `:80` block in the next step keeps the challenge path reachable. With the
Docker route, add a cron entry running `docker run ... certbot renew` daily.

---

## 8. Switch to TLS

```bash
sudo sed "s/__API_HOST__/$HOST/g" deploy/nginx/l2l-api-https.conf \
  | sudo tee /etc/nginx/conf.d/l2l-api.conf > /dev/null

sudo nginx -t && sudo systemctl reload nginx
```

**Check** — this is the URL the browser will use:
```bash
curl -s "https://$HOST/api/health"
curl -sI "http://$HOST/api/health" | head -n 1     # expect: 301
```

---

## 9. Wire the frontend to it

1. Set **`VITE_API_URL=https://<your-host>/api`** in the project's environment
   (and in the production env — I can do both for you, just send me the host).
2. **Redeploy the frontend.** Vite inlines env vars at *build* time, so changing
   `VITE_API_URL` does nothing until the frontend is rebuilt.
3. **Firebase → Authentication → Settings → Authorized domains:** add your
   deployed frontend's domain. Google sign-in refuses origins that aren't
   listed; email/password does not need it.

Then sign in on the deployed frontend: your Firebase session's ID token is sent
to `https://<host>/api`, Django verifies it, and creates the matching user row
with the role you picked.

---

## Day-2 operations

```bash
cd ~/sih-trial

# Deploy new code
git pull
cd backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Logs
docker compose logs -f web
sudo tail -f /var/log/nginx/error.log

# Django shell / management commands
docker compose exec web python manage.py createsuperuser
docker compose exec web python manage.py seed_demo --force   # re-seed from scratch

# Database backup (the only stateful thing on the box)
docker compose exec -T db pg_dump -U skillbridge skillbridge > ~/backup-$(date +%F).sql
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `curl 127.0.0.1:8000/api/health` fails | container crashed or DB not ready | `docker compose logs web`; if Postgres never became healthy, check `POSTGRES_PASSWORD` isn't empty |
| `400 Bad Request` / "Invalid HTTP_HOST header" | hostname missing from `DJANGO_ALLOWED_HOSTS` | add `$HOST`, then `up -d` again |
| Health works from the box but not from your laptop | security group | open 80/443; confirm the Elastic IP is the one in DNS |
| Browser: CORS / "blocked by CORS policy" | origin missing from `CORS_ALLOWED_ORIGINS` | add the **frontend** origin (not the API host) |
| Browser: mixed-content error | `VITE_API_URL` is `http://` | must be `https://`; an https page cannot call http |
| 413 on evidence upload | nginx default 1 MiB limit | already raised to 10m in the configs; confirm `nginx -t` picked up your file |
| Certificate fails to issue | port 80 closed, or DNS not pointing at the Elastic IP | `getent hosts $HOST`, then check the security group |
| Every API call returns 401 | Django couldn't verify the token | set `FIREBASE_PROJECT_ID` (`docker compose exec web env | grep FIREBASE`) |
| AI features return 503 | gateway key missing | set `VLY_INTEGRATION_KEY` and restart the web container |
| `!override` / YAML error from compose | Compose older than v2.24 | install a current plugin (step 2), or edit the `ports` line in `docker-compose.yml` to `127.0.0.1:8000:8000` |

> The seeded demo accounts (`DEMO_PASSWORD`) authenticate against Django and are
> for the admin and the API test suite. The app itself signs in with Firebase —
> so `DemoPass@123` will not work in the login form.
