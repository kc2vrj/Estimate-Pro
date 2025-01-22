#!/bin/bash

# Print commands and exit on errors
set -e

echo "Estimate Pro Uninstall Script"
echo "----------------------------"

# Check if running as root
if [ "$(id -u)" != "0" ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

APP_DIR="/opt/estimate-pro"
SERVICE_FILE="/etc/systemd/system/estimate-pro.service"
LOG_FILES=("/var/log/estimate-pro.log" "/var/log/estimate-pro.error.log")
LOGROTATE_FILE="/etc/logrotate.d/estimate-pro"

# Function to backup data
backup_data() {
    local backup_dir="/opt/estimate-pro-backup-$(date +%Y%m%d_%H%M%S)"
    echo "Creating backup at $backup_dir"
    
    # Create backup directory
    mkdir -p "$backup_dir"
    
    # Backup database if it exists
    if [ -d "$APP_DIR/data" ]; then
        echo "Backing up database..."
        cp -r "$APP_DIR/data" "$backup_dir/"
    fi
    
    # Backup logs if they exist
    echo "Backing up logs..."
    for log_file in "${LOG_FILES[@]}"; do
        if [ -f "$log_file" ]; then
            cp "$log_file" "$backup_dir/"
        fi
    done
    
    echo "Backup completed at $backup_dir"
    return 0
}

# Function to remove the service
remove_service() {
    echo "Stopping and removing service..."
    
    # Stop and disable the service
    if systemctl is-active --quiet estimate-pro; then
        systemctl stop estimate-pro
    fi
    if systemctl is-enabled --quiet estimate-pro; then
        systemctl disable estimate-pro
    fi
    
    # Remove service file
    if [ -f "$SERVICE_FILE" ]; then
        rm -f "$SERVICE_FILE"
        systemctl daemon-reload
    fi
    
    # Remove log files
    for log_file in "${LOG_FILES[@]}"; do
        if [ -f "$log_file" ]; then
            rm -f "$log_file"
        fi
    done
    
    # Remove logrotate configuration
    if [ -f "$LOGROTATE_FILE" ]; then
        rm -f "$LOGROTATE_FILE"
    fi
    
    return 0
}

# Function to remove the application
remove_application() {
    echo "Removing application files..."
    
    if [ -d "$APP_DIR" ]; then
        rm -rf "$APP_DIR"
    fi
    
    return 0
}

# Function to remove the user
remove_user() {
    echo "Removing application user..."
    
    if id -u estimatepro &>/dev/null; then
        pkill -u estimatepro || true  # Kill any running processes
        userdel -r estimatepro 2>/dev/null || true
    fi
    
    return 0
}

# Main uninstall process
echo "This script will uninstall Estimate Pro from your system."
echo "WARNING: This action cannot be undone!"
echo

# Ask about backup
read -p "Would you like to backup your data before uninstalling? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    backup_data
fi

# Ask for confirmation
read -p "Are you sure you want to uninstall Estimate Pro? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled"
    exit 0
fi

# Ask about data removal
read -p "Would you like to remove all data including the database? (y/N) " -n 1 -r
echo
REMOVE_DATA=false
if [[ $REPLY =~ ^[Yy]$ ]]; then
    REMOVE_DATA=true
fi

echo "Uninstalling Estimate Pro..."

# Stop and remove service
remove_service

# Remove application files
if [ "$REMOVE_DATA" = true ]; then
    remove_application
else
    # Keep the data directory
    if [ -d "$APP_DIR/data" ]; then
        mv "$APP_DIR/data" "/tmp/estimate-pro-data"
        remove_application
        mkdir -p "$APP_DIR"
        mv "/tmp/estimate-pro-data" "$APP_DIR/data"
        echo "Data preserved at $APP_DIR/data"
    else
        remove_application
    fi
fi

# Remove user
remove_user

echo
echo "Uninstall completed successfully!"
if [ "$REMOVE_DATA" = false ]; then
    echo "Note: Your data is preserved at $APP_DIR/data"
fi
echo "If you backed up your data, you can find it in the backup directory shown above."
