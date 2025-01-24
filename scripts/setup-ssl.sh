#!/bin/bash

# SSL Certificate Setup Script with Fallback

# Ensure certbot directories exist
mkdir -p /etc/letsencrypt /var/www/certbot

# Flag to track SSL certificate status
SSL_GENERATED=false

# Check if certificates already exist
if [ ! -d "/etc/letsencrypt/live" ] || [ -z "$(ls -A /etc/letsencrypt/live 2>/dev/null)" ]; then
    echo "No SSL certificates found. Attempting to generate..."
    
    # Optional: Allow domain to be passed as an environment variable
    if [ -z "$SSL_DOMAIN" ]; then
        echo "No SSL_DOMAIN environment variable set. Skipping automatic SSL generation."
        SSL_GENERATED=false
    else
        # Use a default email if not provided
        EMAIL="${SSL_EMAIL:-admin@$SSL_DOMAIN}"
        
        # Attempt to generate SSL certificate
        certbot certonly \
            --standalone \
            --non-interactive \
            --agree-tos \
            --domain "$SSL_DOMAIN" \
            --email "$EMAIL"
        
        # Check if certificate generation was successful
        if [ $? -eq 0 ]; then
            echo "SSL Certificate generated successfully for $SSL_DOMAIN"
            SSL_GENERATED=true
        else
            echo "Failed to generate SSL certificate. Continuing without SSL."
            SSL_GENERATED=false
        fi
    fi
else
    echo "SSL Certificates already exist."
    SSL_GENERATED=true
fi

# Attempt certificate renewal (non-blocking)
if [ "$SSL_GENERATED" = true ]; then
    certbot renew --dry-run &
fi

# Always exit successfully to allow the app to start
exit 0
