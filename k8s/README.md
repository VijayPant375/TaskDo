# TaskDo Kubernetes Deployment

This directory contains the Kubernetes manifests required to run the TaskDo application.

## Secrets Management (CRITICAL)

To prevent security leaks, all sensitive credentials have been removed from the repository.

**You must inject these secrets manually before deployment.**

Do not commit hardcoded secrets into `secrets.yaml` or any other deployment file.

### Required Variables

Your secret must contain the following keys exactly:

* `MONGO_URI` (Can be safely supplied via ConfigMap or Secret, default: `mongodb://mongo:27017/taskdo`)
* `REDIS_URL` (Can be safely supplied via ConfigMap or Secret, default: `redis://redis:6379`)
* `JWT_ACCESS_SECRET`
* `JWT_REFRESH_SECRET`
* `GOOGLE_CLIENT_ID`
* `GOOGLE_CLIENT_SECRET`
* `STRIPE_SECRET_KEY`
* `STRIPE_WEBHOOK_SECRET`
* `STRIPE_MONTHLY_PRICE_ID`
* `STRIPE_YEARLY_PRICE_ID`
* `ENCRYPTION_KEY`

Optional non-breaking internal service variables:

* `INTERNAL_MONGO_URI` (recommended for Docker/Kubernetes: `mongodb://mongo:27017/taskdo`)
* `INTERNAL_REDIS_URL` (recommended for Docker/Kubernetes: `redis://redis:6379`)

For the frontend image, set `VITE_API_URL=/api` at image build time so the static bundle continues to route API traffic through the cluster ingress/proxy path.

### Injection Method 1: Platform UI (Recommended)

If you are using a managed platform provider like Render, AWS EKS, or DigitalOcean, supply these environment variables directly via their Secret Management UI. Map the group to the `taskdo-secrets` name if necessary depending on the cloud provider's integration.

### Injection Method 2: Manual `kubectl` Creation

If deploying directly using `kubectl`, create the secret dynamically using string literals (ensure your terminal history is cleared afterward, or use an env file that is `.gitignore`d):

```bash
kubectl create secret generic taskdo-secrets \
  --namespace=taskdo \
  --from-literal=JWT_ACCESS_SECRET="your-actual-secret" \
  --from-literal=JWT_REFRESH_SECRET="your-actual-secret" \
  --from-literal=GOOGLE_CLIENT_ID="your-client-id" \
  --from-literal=GOOGLE_CLIENT_SECRET="your-client-secret" \
  --from-literal=STRIPE_SECRET_KEY="sk_live_..." \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_..." \
  --from-literal=STRIPE_MONTHLY_PRICE_ID="price_..." \
  --from-literal=STRIPE_YEARLY_PRICE_ID="price_..." \
  --from-literal=ENCRYPTION_KEY="your-32-byte-base64-key"
```

## Deployment

Once your `taskdo-secrets` secret is securely configured, apply the rest of the manifests:

```bash
kubectl apply -f k8s/
```
