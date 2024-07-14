#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Define your project ID and region
PROJECT_ID="ai-signposting"
REGION="us-central1"
SERVICE_NAME="ai-api"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Build the Docker image
echo "Building the Docker image..."
docker build -t $IMAGE_NAME .

# Push the Docker image to Google Container Registry
echo "Pushing the Docker image to Google Container Registry..."
docker push $IMAGE_NAME

# Deploy the Docker image to Google Cloud Run
echo "Deploying the Docker image to Google Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated

echo "Deployment complete. Your service is now running on Cloud Run."

# Optional: Add IAM policy binding for unauthenticated access
echo "Ensuring unauthenticated access is allowed..."
gcloud run services add-iam-policy-binding $SERVICE_NAME \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --region=$REGION

echo "Unauthenticated access configured."