#!/bin/bash

# Print commands and exit on errors
set -ex

echo "Starting Estimate-Pro installation..."

# Check if running as root
if [ "$(id -u)" != "0" ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Detect OS and version
if [ -f /etc/os-release ]; then
    # Load OS detection variables
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
elif type lsb_release >/dev/null 2>&1; then
    OS=$(lsb_release -si)
    VER=$(lsb_release -sr)
else
    OS=$(uname -s)
    VER=$(uname -r)
fi

echo "Detected OS: $OS"
echo "Version: $VER"

# Function to install Node.js
install_nodejs() {
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        case $OS in
            *"Ubuntu"* | *"Debian"*)
                curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
                apt-get install -y nodejs
                ;;
            *"CentOS"* | *"Red Hat"* | *"Fedora"*)
                curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
                dnf install -y nodejs
                ;;
            *"SUSE"*)
                zypper install -y nodejs18
                ;;
            *)
                echo "Unsupported OS for automatic Node.js installation"
                echo "Please install Node.js manually and run this script again"
                exit 1
                ;;
        esac
    fi
}

# Function to install system dependencies
install_dependencies() {
    echo "Installing system dependencies..."
    case $OS in
        *"Ubuntu"* | *"Debian"*)
            apt-get update
            apt-get install -y build-essential python3 git curl
            ;;
        *"CentOS"* | *"Red Hat"* | *"Fedora"*)
            dnf group install -y "Development Tools"
            dnf install -y python3 git curl
            ;;
        *"SUSE"*)
            zypper install -y -t pattern devel_basis
            zypper install -y python3 git curl
            ;;
        *)
            echo "Unsupported OS for automatic dependency installation"
            echo "Please install build-essential, python3, git, and curl manually"
            exit 1
            ;;
    esac
}

# Function to setup systemd service
setup_systemd() {
    echo "Setting up systemd service..."
    case $OS in
        *"Ubuntu"* | *"Debian"* | *"CentOS"* | *"Red Hat"* | *"Fedora"* | *"SUSE"*)
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
            systemctl daemon-reload
            systemctl enable estimate-pro
            systemctl start estimate-pro
            ;;
        *)
            echo "Systemd service setup not supported on this OS"
            echo "Please setup the service manually"
            ;;
    esac
}

# Main installation process
echo "Installing Estimate Pro..."

# Install dependencies based on OS
install_dependencies

# Install Node.js
install_nodejs

# Create application user if it doesn't exist
if ! id -u estimatepro &>/dev/null; then
    useradd -m -s /bin/bash estimatepro
    # Verify user was created successfully
    if ! id -u estimatepro &>/dev/null; then
        echo "Failed to create user estimatepro"
        exit 1
    fi
    echo "Created user: estimatepro"
fi

# Set up application directory
APP_DIR="/opt/estimate-pro"
mkdir -p $APP_DIR
chown estimatepro:estimatepro $APP_DIR

# Clone the repository (if deploying from git)
if [ ! -d "$APP_DIR/.git" ]; then
    su estimatepro -c "git clone https://github.com/kc2vrj/Estimate-Pro.git $APP_DIR"
else
    echo "Git repository already exists, pulling latest changes..."
    cd $APP_DIR
    su estimatepro -c "cd $APP_DIR && git pull"
fi

# Install npm dependencies with legacy peer deps to avoid warnings
cd $APP_DIR
su estimatepro -c "cd $APP_DIR && npm install --legacy-peer-deps"

# Update npm to latest version
su estimatepro -c "cd $APP_DIR && npm install -g npm@latest"

# Clean up deprecated packages
su estimatepro -c "cd $APP_DIR && npm audit fix"

# Create data directory with proper permissions
mkdir -p $APP_DIR/data
chown estimatepro:estimatepro $APP_DIR/data

# Setup the database
su estimatepro -c "cd $APP_DIR && npm run setup"

# Build the application
su estimatepro -c "cd $APP_DIR && npm run build"

# Setup systemd service
setup_systemd

echo "Installation complete!"
echo "Estimate Pro is now running as a service"
echo "You can check the status with: systemctl status estimate-pro"
echo "The application should be available at http://your-server:8080"

# Print OS-specific notes
case $OS in
    *"Ubuntu"* | *"Debian"*)
        echo "Note: If you need to configure a firewall, run:"
        echo "sudo ufw allow 8080/tcp"
        ;;
    *"CentOS"* | *"Red Hat"* | *"Fedora"*)
        echo "Note: If you need to configure a firewall, run:"
        echo "sudo firewall-cmd --permanent --add-port=8080/tcp"
        echo "sudo firewall-cmd --reload"
        ;;
    *"SUSE"*)
        echo "Note: If you need to configure a firewall, run:"
        echo "sudo firewall-cmd --permanent --add-port=8080/tcp"
        echo "sudo firewall-cmd --reload"
        ;;
esac
