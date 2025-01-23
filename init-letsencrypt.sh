#!/bin/bash

# Domains to generate certificates for
DOMAINS="estimatepro.com www.estimatepro.com"
EMAIL="your-email@example.com"  # Replace with your email

# Create necessary directories
mkdir -p ./certbot/conf ./certbot/www

# Generate staging certificate (for testing)
docker-compose run --rm certbot certonly --webroot -w /var/www/certbot \
    -d estimatepro.com -d www.estimatepro.com \
    --email $EMAIL \
    --staging \
    --agree-tos \
    --force-renewal

# Generate production certificate
docker-compose run --rm certbot certonly --webroot -w /var/www/certbot \
    -d estimatepro.com -d www.estimatepro.com \
    --email $EMAIL \
    --agree-tos \
    --force-renewal

# Set appropriate permissions
chmod +x init-letsencrypt.sh
