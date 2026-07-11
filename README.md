# PFire

**This application helps companies eliminate manual work in safety inspections** of emergency equipment, such as fire extinguishers, exits, and hydrants, among others, generating standardized, traceable reports per client, ready in minutes, not hours of spreadsheets and paperwork.

The core of the application is a **reusable template system**: each template defines a report's fields and is reused across every inspection of that type. From a single template, teams generate multiple client-specific reports, and templates can be cloned to create variations without starting from scratch. Both templates and reports are highly customizable, adapting to each company's specific needs.

## Plans

PFire offers three subscription tiers, differing in how many templates an account can create:

- **Basic:** 1 template
- **Pro:** up to 25 templates
- **Premium:** unlimited templates

## Tech Stack

- **Backend:** FastAPI (Python), exposing a GraphQL API
- **Frontend:** React, with all search/filtering built on **TanStack Query** integrated with the GraphQL API for efficient, reactive queries directly in components
- **Database:** MongoDB
- **Auth:** JWT-based, with optional Firebase Authentication for social login

## Quick Start

### 1. Clone

```bash
git clone https://gitlab.com/protecao24h/pfire.git
cd pfire
```

### 2. Prerequisites

- **Linux terminal** (Ubuntu/Debian recommended). On Windows, install WSL:
  ```bash
  wsl --install
  wsl --set-default Ubuntu
  sudo apt update && sudo apt full-upgrade -y   # repeat periodically
  ```
- **Python** ≥ 3.12
- **Node.js** ≥ 22
- **Docker** (optional, for a production-like backend run)
- **Redis** account
- **MongoDB** account
- **Brevo** account
- **Stripe** account
- **Google reCAPTCHA** key

### 3. Environment variables

Create `.env` in `backend/`:

```
MONGODB_URL=mongodb+srv://<username>:<password>@pfire.c9mvo.mongodb.net/?retryWrites=true&w=majority&appName=pfire
PRIVATE_KEY_PASSWORD=password
BREVO_API_KEY=key
RECAPTCHA_SECRET_KEY=key
REDIS_HOST=host
REDIS_PORT=port
REDIS_PASSWORD=password
STRIPE_API_KEY=key
STRIPE_WEBHOOK_SECRET=secret
```

Create `.env` in `frontend/`:

```
VITE_RECAPTCHA_SITE_KEY=recaptcha_token
```

Use real values agreed upon with the team, never commit this file.

### 4. JWT keys (required, Ubuntu/Debian terminal only)

```bash
mkdir secrets && cd secrets
openssl genpkey -algorithm RSA -aes-256-cbc -out privada.pem   # password must match PRIVATE_KEY_PASSWORD
openssl rsa -in privada.pem -pubout -out publica.pem
# add Firebase's serviceAccountKey.json to this folder
cd .. && sudo cp -r secrets /etc/secrets
```

### 5. Run

**Backend** (terminal 1):
```bash
cd backend
dos2unix startBackend.sh   # first run only
sudo ./startBackend.sh
```
Docker alternative:
```bash
docker buildx build .
docker image list --all              # copy the new image ID
docker run --name pfire-backend -p 8080:10000 <image_id>
```

**Frontend** (terminal 2):
```bash
cd frontend
dos2unix startFrontend.sh  # first run only
sudo ./startFrontend.sh
```

App runs at **http://localhost:8000** (backend) and **http://localhost:3000** (frontend).

## Database Diagram

## Working on the Project

**Dependencies:** any change to `pyproject.toml`, `uv.lock`, `package.json`, or `package-lock.json` must ship in its own justified commit, unexplained changes to these files will be rejected in review.

**Branches:** `main` and `develop` are protected, updates only via merge request. All development and bug fixes (except production hotfixes) happen on `develop` or branches off it.

**Staying up to date:**
```bash
git pull                 # on develop
git merge develop        # into your working branch
```

**CI/security:** every push triggers a pipeline that scans for malicious code. Failed commits are rejected in merge requests, run a vulnerability check locally before pushing (see `.gitlab-ci.yml` for the commands).

**Avoid editing unless strictly necessary:** `Dockerfiles`, `docker-compose.yml`, `vite.config.ts`, `.gitlab-ci.yml`, `startBackend.sh`, `startFrontend.sh`, `frontend/worker.js`, `frontend/wrangler.toml`.
