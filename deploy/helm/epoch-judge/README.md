# Epoch Judge — Helm Chart

Helm Chart for deploying Epoch Judge on Kubernetes.

## Prerequisites

- Kubernetes 1.25+
- Helm 3.10+
- An existing MySQL 8.x instance
- An existing Redis 7.x instance
- A `ReadWriteMany` StorageClass (for testcases PVC shared across api & judge pods)

## Quick Start

```bash
# 1. Add required values
helm install epoch-judge ./deploy/helm/epoch-judge \
  --set mysql.host=mysql.example.com \
  --set mysql.password=YOUR_DB_PASSWORD \
  --set redis.host=redis.example.com \
  --set redis.password=YOUR_REDIS_PASSWORD \
  --set auth.jwtSecret=$(openssl rand -hex 32)
```

## Installation

### With external MySQL and Redis (recommended for production)

```bash
helm install epoch-judge ./deploy/helm/epoch-judge \
  --namespace epoch-judge --create-namespace \
  --set mysql.host=mysql.example.com \
  --set mysql.user=epoch \
  --set mysql.password=YOUR_DB_PASSWORD \
  --set mysql.database=epoch_judge \
  --set redis.host=redis.example.com \
  --set redis.password=YOUR_REDIS_PASSWORD \
  --set auth.jwtSecret=$(openssl rand -hex 32) \
  --set seedAdmin.password=YOUR_ADMIN_PASSWORD
```

### With Ingress

```bash
helm install epoch-judge ./deploy/helm/epoch-judge \
  --namespace epoch-judge --create-namespace \
  --set mysql.host=mysql.example.com \
  --set mysql.password=YOUR_DB_PASSWORD \
  --set redis.host=redis.example.com \
  --set redis.password=YOUR_REDIS_PASSWORD \
  --set auth.jwtSecret=$(openssl rand -hex 32) \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set 'ingress.hosts[0].host=judge.example.com' \
  --set 'ingress.hosts[0].paths[0].path=/' \
  --set 'ingress.hosts[0].paths[0].pathType=Prefix'
```

### With TLS

```bash
helm install epoch-judge ./deploy/helm/epoch-judge \
  --namespace epoch-judge --create-namespace \
  --set mysql.host=mysql.example.com \
  --set mysql.password=YOUR_DB_PASSWORD \
  --set redis.host=redis.example.com \
  --set redis.password=YOUR_REDIS_PASSWORD \
  --set auth.jwtSecret=$(openssl rand -hex 32) \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set 'ingress.hosts[0].host=judge.example.com' \
  --set 'ingress.hosts[0].paths[0].path=/' \
  --set 'ingress.hosts[0].paths[0].pathType=Prefix' \
  --set 'ingress.tls[0].secretName=epoch-judge-tls' \
  --set 'ingress.tls[0].hosts[0]=judge.example.com'
```

### Using S3 storage for testcases

```bash
helm install epoch-judge ./deploy/helm/epoch-judge \
  --set mysql.host=mysql.example.com \
  --set mysql.password=YOUR_DB_PASSWORD \
  --set redis.host=redis.example.com \
  --set redis.password=YOUR_REDIS_PASSWORD \
  --set auth.jwtSecret=$(openssl rand -hex 32) \
  --set storage.type=s3 \
  --set storage.s3.endpoint=https://s3.amazonaws.com \
  --set storage.s3.bucket=epoch-judge-testcases \
  --set storage.s3.accessKey=YOUR_ACCESS_KEY \
  --set storage.s3.secretKey=YOUR_SECRET_KEY \
  --set storage.s3.region=us-east-1
```

## Configuration

See [`values.yaml`](./values.yaml) for the full list of configurable parameters.

### Key Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `api.replicaCount` | Number of API server replicas | `1` |
| `judge.replicaCount` | Number of Judge Worker replicas | `2` |
| `web.replicaCount` | Number of Web frontend replicas | `1` |
| `mysql.host` | External MySQL hostname | `""` |
| `mysql.port` | MySQL port | `3306` |
| `mysql.password` | MySQL password | `""` |
| `redis.host` | External Redis hostname | `""` |
| `redis.port` | Redis port | `6379` |
| `redis.password` | Redis password | `""` |
| `auth.jwtSecret` | JWT signing secret (required) | `""` |
| `ingress.enabled` | Enable Ingress resource | `false` |
| `persistence.enabled` | Enable shared testcases PVC | `true` |
| `persistence.size` | PVC size | `10Gi` |

## Upgrading

```bash
helm upgrade epoch-judge ./deploy/helm/epoch-judge \
  --namespace epoch-judge \
  --reuse-values
```

## Uninstalling

```bash
helm uninstall epoch-judge --namespace epoch-judge
```

> **Note:** PVCs are not automatically deleted. Remove them manually if needed:
> ```bash
> kubectl delete pvc -l app.kubernetes.io/instance=epoch-judge -n epoch-judge
> ```

## Architecture

The chart deploys three components:

- **API** — NestJS REST API (port 3000), handles all business logic and database operations
- **Judge** — NestJS Judge Worker, executes code submissions in sandboxed environments
- **Web** — Nginx serving the SPA frontend, reverse-proxies `/api/` to the API service

Communication flow:
```
Client → Ingress → Web (nginx) → /api/ → API Service → MySQL / Redis
                                              ↓
                                         Judge Workers (via Redis queues)
```
