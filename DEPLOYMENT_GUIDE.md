# Secure Documents Platform - Deployment Guide

A comprehensive guide for deploying the modernized Secure Documents Platform in production environments. This guide covers multiple deployment scenarios including Docker Compose, Kubernetes, and cloud platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Compose Deployment](#docker-compose-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Platform Deployment](#cloud-platform-deployment)
6. [Security Configuration](#security-configuration)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Backup and Recovery](#backup-and-recovery)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: 1Gbps connection

#### Recommended Requirements
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Network**: 1Gbps+ connection with low latency

### Software Dependencies

#### Required Software
- **Docker**: 24.0+ with Docker Compose v2
- **Node.js**: 20.19.0+ (for local development)
- **PostgreSQL**: 15+ (if not using containerized version)
- **Redis**: 7+ (optional, for caching)

#### Optional Software
- **Kubernetes**: 1.28+ (for Kubernetes deployment)
- **kubectl**: Latest version
- **Helm**: 3.12+ (for Helm charts)
- **Terraform**: 1.5+ (for infrastructure as code)

### Network Requirements

#### Ports
- **Frontend**: 3000 (development), 8080 (production)
- **Backend**: 3001
- **Database**: 5432 (PostgreSQL)
- **Cache**: 6379 (Redis)
- **Monitoring**: 9090 (Prometheus), 3000 (Grafana)

#### Firewall Rules
```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Allow application ports (adjust as needed)
sudo ufw allow 3000:3001/tcp
```

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/secure-documents-platform.git
cd secure-documents-platform
```

### 2. Environment Configuration

Copy the production environment template:

```bash
cp .env.production .env
```

### 3. Configure Environment Variables

Edit the `.env` file with your production values:

```bash
# Required: Database Configuration
DB_PASSWORD=your-super-secure-database-password
JWT_SECRET=your-super-secure-jwt-secret-minimum-64-characters
REDIS_PASSWORD=your-super-secure-redis-password

# Required: Domain Configuration
FRONTEND_URL=https://yourdomain.com
VITE_API_URL=https://api.yourdomain.com

# Optional: Email Configuration
SMTP_HOST=smtp.yourdomain.com
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-smtp-password

# Optional: AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-production-s3-bucket
```

### 4. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Option B: Custom Certificate

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificates
cp your-certificate.crt nginx/ssl/cert.pem
cp your-private-key.key nginx/ssl/key.pem
cp your-ca-bundle.crt nginx/ssl/ca-bundle.pem
```

## Docker Compose Deployment

### 1. Quick Start

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. Production Deployment

```bash
# Build and start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services (if needed)
docker-compose up -d --scale backend=2 --scale frontend=2

# Update services
docker-compose pull
docker-compose up -d
```

### 3. Service Management

```bash
# Stop services
docker-compose down

# Stop and remove volumes (⚠️ Data loss)
docker-compose down -v

# Restart specific service
docker-compose restart backend

# View service logs
docker-compose logs backend
docker-compose logs frontend
```

### 4. Database Migration

```bash
# Run database migrations
docker-compose exec backend npm run migrate

# Seed initial data (if needed)
docker-compose exec backend npm run seed
```

## Kubernetes Deployment

### 1. Prerequisites

```bash
# Verify Kubernetes cluster
kubectl cluster-info

# Create namespace
kubectl apply -f deployment/kubernetes/namespace.yaml
```

### 2. Secrets Management

```bash
# Create database secret
kubectl create secret generic db-secret \
  --from-literal=password=your-database-password \
  --namespace=secure-docs

# Create JWT secret
kubectl create secret generic jwt-secret \
  --from-literal=secret=your-jwt-secret \
  --namespace=secure-docs

# Create Redis secret
kubectl create secret generic redis-secret \
  --from-literal=password=your-redis-password \
  --namespace=secure-docs
```

### 3. Deploy Services

```bash
# Deploy PostgreSQL
kubectl apply -f deployment/kubernetes/postgres.yaml

# Deploy Redis
kubectl apply -f deployment/kubernetes/redis.yaml

# Deploy Backend
kubectl apply -f deployment/kubernetes/backend.yaml

# Deploy Frontend
kubectl apply -f deployment/kubernetes/frontend.yaml

# Deploy Ingress
kubectl apply -f deployment/kubernetes/ingress.yaml
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n secure-docs

# Check services
kubectl get services -n secure-docs

# Check ingress
kubectl get ingress -n secure-docs

# View logs
kubectl logs -f deployment/backend -n secure-docs
```

### 5. Scaling

```bash
# Scale backend
kubectl scale deployment backend --replicas=3 -n secure-docs

# Scale frontend
kubectl scale deployment frontend --replicas=2 -n secure-docs

# Auto-scaling (HPA)
kubectl apply -f deployment/kubernetes/hpa.yaml
```

## Cloud Platform Deployment

### AWS Deployment

#### 1. ECS with Fargate

```bash
# Install AWS CLI
aws configure

# Create ECS cluster
aws ecs create-cluster --cluster-name secure-docs-cluster

# Register task definitions
aws ecs register-task-definition --cli-input-json file://deployment/aws/backend-task.json
aws ecs register-task-definition --cli-input-json file://deployment/aws/frontend-task.json

# Create services
aws ecs create-service --cluster secure-docs-cluster --service-name backend --task-definition backend:1 --desired-count 2
aws ecs create-service --cluster secure-docs-cluster --service-name frontend --task-definition frontend:1 --desired-count 2
```

#### 2. EKS (Elastic Kubernetes Service)

```bash
# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create EKS cluster
eksctl create cluster --name secure-docs --region us-west-2 --nodegroup-name workers --node-type t3.medium --nodes 3

# Deploy to EKS
kubectl apply -f deployment/kubernetes/
```

### Google Cloud Platform

#### 1. GKE (Google Kubernetes Engine)

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Create GKE cluster
gcloud container clusters create secure-docs-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-medium

# Get credentials
gcloud container clusters get-credentials secure-docs-cluster --zone us-central1-a

# Deploy application
kubectl apply -f deployment/kubernetes/
```

### Microsoft Azure

#### 1. AKS (Azure Kubernetes Service)

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Create resource group
az group create --name secure-docs-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group secure-docs-rg \
  --name secure-docs-cluster \
  --node-count 3 \
  --node-vm-size Standard_B2s \
  --enable-addons monitoring

# Get credentials
az aks get-credentials --resource-group secure-docs-rg --name secure-docs-cluster

# Deploy application
kubectl apply -f deployment/kubernetes/
```

## Security Configuration

### 1. Network Security

#### Firewall Configuration

```bash
# Ubuntu/Debian
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### Network Policies (Kubernetes)

```bash
# Apply network policies
kubectl apply -f deployment/kubernetes/network-policies.yaml
```

### 2. Container Security

#### Image Scanning

```bash
# Scan images with Trivy
trivy image secure-docs-backend:latest
trivy image secure-docs-frontend:latest

# Scan with Docker Scout
docker scout cves secure-docs-backend:latest
```

#### Security Contexts

```yaml
# Example security context in Kubernetes
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

### 3. Secrets Management

#### Kubernetes Secrets

```bash
# Create TLS secret
kubectl create secret tls tls-secret \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  --namespace=secure-docs

# Create generic secret
kubectl create secret generic app-secrets \
  --from-env-file=.env.production \
  --namespace=secure-docs
```

#### External Secrets (Recommended)

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Configure secret store (AWS Secrets Manager example)
kubectl apply -f deployment/kubernetes/secret-store.yaml
```

### 4. RBAC Configuration

```bash
# Apply RBAC policies
kubectl apply -f deployment/kubernetes/rbac.yaml

# Create service account
kubectl create serviceaccount secure-docs-sa -n secure-docs

# Bind role to service account
kubectl create rolebinding secure-docs-binding \
  --role=secure-docs-role \
  --serviceaccount=secure-docs:secure-docs-sa \
  --namespace=secure-docs
```

## Monitoring and Logging

### 1. Prometheus and Grafana Setup

#### Docker Compose

```bash
# Start monitoring stack
docker-compose --profile monitoring up -d

# Access Grafana
open http://localhost:3000
# Default credentials: admin/admin
```

#### Kubernetes

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Apply custom monitoring configs
kubectl apply -f deployment/kubernetes/monitoring/
```

### 2. Log Aggregation

#### ELK Stack (Elasticsearch, Logstash, Kibana)

```bash
# Deploy ELK stack
kubectl apply -f deployment/kubernetes/logging/elasticsearch.yaml
kubectl apply -f deployment/kubernetes/logging/logstash.yaml
kubectl apply -f deployment/kubernetes/logging/kibana.yaml
```

#### Fluentd for Log Collection

```bash
# Deploy Fluentd DaemonSet
kubectl apply -f deployment/kubernetes/logging/fluentd.yaml
```

### 3. Application Performance Monitoring

#### New Relic

```bash
# Add New Relic agent to backend
npm install newrelic

# Configure in backend
export NEW_RELIC_LICENSE_KEY=your-license-key
export NEW_RELIC_APP_NAME=secure-docs-backend
```

#### Datadog

```bash
# Install Datadog agent
helm repo add datadog https://helm.datadoghq.com
helm install datadog datadog/datadog \
  --set datadog.apiKey=your-api-key \
  --set datadog.appKey=your-app-key
```

### 4. Health Checks and Alerts

#### Kubernetes Health Checks

```yaml
# Liveness probe
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

# Readiness probe
readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

#### Alerting Rules

```bash
# Apply Prometheus alerting rules
kubectl apply -f deployment/kubernetes/monitoring/alert-rules.yaml
```

## Backup and Recovery

### 1. Database Backup

#### Automated Backup Script

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="secure_docs_backup_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
docker-compose exec -T database pg_dump -U postgres secure_docs > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/$BACKUP_FILE.gz s3://your-backup-bucket/database/

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

#### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: secure-docs
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h postgres -U postgres secure_docs | gzip > /backup/backup-$(date +%Y%m%d-%H%M%S).sql.gz
              aws s3 cp /backup/backup-*.sql.gz s3://your-backup-bucket/
          restartPolicy: OnFailure
```

### 2. File Storage Backup

```bash
# Backup uploaded files
rsync -av --delete /app/uploads/ /backups/uploads/

# Upload to cloud storage
aws s3 sync /backups/uploads/ s3://your-backup-bucket/uploads/
```

### 3. Recovery Procedures

#### Database Recovery

```bash
# Stop application
docker-compose stop backend frontend

# Restore database
gunzip -c backup_file.sql.gz | docker-compose exec -T database psql -U postgres -d secure_docs

# Start application
docker-compose start backend frontend
```

#### Full System Recovery

```bash
# 1. Restore infrastructure
terraform apply

# 2. Deploy application
kubectl apply -f deployment/kubernetes/

# 3. Restore database
kubectl exec -i postgres-pod -- psql -U postgres -d secure_docs < backup.sql

# 4. Restore files
kubectl cp uploads-backup/ pod-name:/app/uploads/

# 5. Verify application
curl -f http://your-domain.com/health
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check database status
docker-compose exec database pg_isready -U postgres

# Check connection from backend
docker-compose exec backend npm run db:test

# View database logs
docker-compose logs database
```

#### 2. Memory Issues

```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
```

#### 3. SSL Certificate Issues

```bash
# Check certificate expiry
openssl x509 -in cert.pem -text -noout | grep "Not After"

# Renew Let's Encrypt certificate
sudo certbot renew

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

#### 4. Performance Issues

```bash
# Check application metrics
curl http://localhost:3001/metrics

# Monitor resource usage
kubectl top pods -n secure-docs
kubectl top nodes

# Check slow queries
docker-compose exec database psql -U postgres -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Debugging Commands

```bash
# Docker Compose debugging
docker-compose logs --tail=100 -f service-name
docker-compose exec service-name /bin/bash

# Kubernetes debugging
kubectl describe pod pod-name -n secure-docs
kubectl logs -f pod-name -n secure-docs
kubectl exec -it pod-name -n secure-docs -- /bin/bash

# Network debugging
kubectl run debug --image=nicolaka/netshoot -it --rm -- /bin/bash
```

## Maintenance

### 1. Regular Updates

#### Security Updates

```bash
# Update base images
docker-compose pull
docker-compose up -d

# Update Kubernetes
kubectl set image deployment/backend backend=secure-docs-backend:new-version -n secure-docs
```

#### Dependency Updates

```bash
# Backend dependencies
cd backend
npm audit
npm update
npm audit fix

# Frontend dependencies
cd frontend
npm audit
npm update
npm audit fix
```

### 2. Performance Optimization

#### Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM documents WHERE user_id = 'user123';

-- Update statistics
ANALYZE;

-- Reindex if needed
REINDEX DATABASE secure_docs;
```

#### Application Optimization

```bash
# Profile application
docker-compose exec backend npm run profile

# Optimize bundle size
cd frontend
npm run analyze
```

### 3. Scaling

#### Horizontal Scaling

```bash
# Docker Compose
docker-compose up -d --scale backend=3 --scale frontend=2

# Kubernetes
kubectl scale deployment backend --replicas=5 -n secure-docs
```

#### Vertical Scaling

```yaml
# Update resource limits
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### 4. Monitoring and Alerting

#### Set up Alerts

```yaml
# Prometheus alert rules
groups:
- name: secure-docs-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    annotations:
      summary: High error rate detected
```

#### Regular Health Checks

```bash
#!/bin/bash
# health-check.sh

# Check application health
curl -f http://localhost:3001/health || echo "Backend health check failed"
curl -f http://localhost:3000/health || echo "Frontend health check failed"

# Check database
docker-compose exec database pg_isready -U postgres || echo "Database health check failed"

# Check disk space
df -h | awk '$5 > 80 {print "Disk usage high: " $0}'
```

## Security Best Practices

### 1. Regular Security Audits

```bash
# Scan for vulnerabilities
npm audit
docker scout cves
trivy fs .

# Check for secrets in code
git-secrets --scan
truffleHog --regex --entropy=False .
```

### 2. Access Control

```bash
# Rotate secrets regularly
kubectl create secret generic new-jwt-secret --from-literal=secret=new-secret
kubectl patch deployment backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","env":[{"name":"JWT_SECRET","valueFrom":{"secretKeyRef":{"name":"new-jwt-secret","key":"secret"}}}]}]}}}}'

# Review access logs
kubectl logs -l app=backend | grep "authentication"
```

### 3. Compliance

```bash
# Generate compliance reports
kubectl get pods -o json | jq '.items[] | select(.spec.securityContext.runAsRoot == true)'

# Check for PCI DSS compliance
# Ensure all data is encrypted in transit and at rest
# Implement proper access controls
# Maintain audit logs
```

## Conclusion

This deployment guide provides comprehensive instructions for deploying the Secure Documents Platform in various environments. For additional support or questions, please refer to the project documentation or contact the development team.

### Support Contacts

- **Technical Support**: tech-support@yourdomain.com
- **DevOps Team**: devops@yourdomain.com
- **Security Team**: security@yourdomain.com

### Additional Resources

- [Project Repository](https://github.com/your-org/secure-documents-platform)
- [API Documentation](https://api.yourdomain.com/docs)
- [Status Page](https://status.yourdomain.com)
- [Knowledge Base](https://docs.yourdomain.com)

