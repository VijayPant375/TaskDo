#!/bin/bash
set -e

kubectl apply -f k8s/namespace.yaml
sleep 2
kubectl apply -f k8s/
