#!/bin/bash

# Print commands and exit on errors
set -ex

echo "Starting Estimate-Pro installation..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Update package list
apt-get update

# Install Node.js repository
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install build essentials and other dependencies
apt-get install -y build-essential python3 git

# Create application user if it doesn't exist
if ! id -u estimatepro &>/dev/null; then
    useradd -m -s /bin/bash estimatepro
    echo "Created user: estimatepro"
fi

# Set up application directory
APP_DIR="/opt/estimate-pro"
mkdir -p $APP_DIR
chown estimatepro:estimatepro $APP_DIR

# Clone the repository (if deploying from git)
if [ ! -d "$APP_DIR/.git" ]; then
    su - estimatepro -c "git clone https://github.com/kc2vrj/Estimate-Pro.git $APP_DIR"
else
    echo "Git repository already exists, pulling latest changes..."
    cd $APP_DIR
    su - estimatepro -c "cd $APP_DIR && git pull"
fi

# Install npm dependencies
cd $APP_DIR
su - estimatepro -c "cd $APP_DIR && npm install"

# Create data directory with proper permissions
mkdir -p $APP_DIR/data
chown estimatepro:estimatepro $APP_DIR/data

# Setup the database
su - estimatepro -c "cd $APP_DIR && npm run setup"

# Build the application
su - estimatepro -c "cd $APP_DIR && npm run build"

# Create systemd service file
cat > /etc/systemd/system/estimate-pro.service << EOL
[Unit]
Description=Estimate Pro Application
After=network.target

[Service]
Type=simple
User=estimatepro
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd and enable/start service
systemctl daemon-reload
systemctl enable estimate-pro
systemctl start estimate-pro

echo "Installation complete!"
echo "Estimate Pro is now running as a service"
echo "You can check the status with: systemctl status estimate-pro"
echo "The application should be available at http://your-server:8080"
