#!/bin/bash

# Print commands and exit on errors
set -ex

echo "Checking Estimate-Pro installation..."

# Check if running as root
if [ "$(id -u)" != "0" ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Function to check if service is installed and running
check_installation() {
    if systemctl is-active --quiet estimate-pro 2>/dev/null; then
        echo "Estimate Pro service is running"
        return 0
    elif systemctl is-enabled --quiet estimate-pro 2>/dev/null; then
        echo "Estimate Pro service is installed but not running"
        return 1
    else
        echo "Estimate Pro service is not installed"
        return 2
    fi
}

# Function to backup database
backup_database() {
    local backup_dir="/opt/estimate-pro/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    echo "Creating database backup..."
    mkdir -p "$backup_dir"
    if [ -f "/opt/estimate-pro/data/estimates.db" ]; then
        cp "/opt/estimate-pro/data/estimates.db" "$backup_dir/estimates_$timestamp.db"
        echo "Database backed up to $backup_dir/estimates_$timestamp.db"
    fi
}

# Function to update existing installation
update_installation() {
    echo "Updating Estimate Pro..."
    
    # Stop the service
    systemctl stop estimate-pro

    # Backup database
    backup_database

    # Pull latest changes
    cd $APP_DIR
    su estimatepro -c "cd $APP_DIR && git pull"

    # Update npm dependencies
    su estimatepro -c "cd $APP_DIR && npm install --legacy-peer-deps"

    # Update npm to latest version
    su estimatepro -c "cd $APP_DIR && npm install -g npm@latest"

    # Run any database migrations if they exist
    if [ -f "$APP_DIR/scripts/migrate.js" ]; then
        echo "Running database migrations..."
        su estimatepro -c "cd $APP_DIR && node scripts/migrate.js"
    fi

    # Rebuild the application
    su estimatepro -c "cd $APP_DIR && npm run build"

    # Start the service
    systemctl start estimate-pro
    
    echo "Update completed successfully"
}

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
StandardOutput=append:/var/log/estimate-pro.log
StandardError=append:/var/log/estimate-pro.error.log

[Install]
WantedBy=multi-user.target
EOL
            # Create log files with proper permissions
            touch /var/log/estimate-pro.log /var/log/estimate-pro.error.log
            chown estimatepro:estimatepro /var/log/estimate-pro.log /var/log/estimate-pro.error.log
            chmod 644 /var/log/estimate-pro.log /var/log/estimate-pro.error.log

            systemctl daemon-reload
            systemctl enable estimate-pro
            systemctl start estimate-pro

            # Add log rotation configuration
            cat > /etc/logrotate.d/estimate-pro << EOL
/var/log/estimate-pro.log /var/log/estimate-pro.error.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 estimatepro estimatepro
}
EOL
            ;;
        *)
            echo "Systemd service setup not supported on this OS"
            echo "Please setup the service manually"
            ;;
    esac
}

# Main installation process
APP_DIR="/opt/estimate-pro"

# Check if already installed
check_installation
INSTALL_STATUS=$?

if [ "$INSTALL_STATUS" -eq 0 ] || [ "$INSTALL_STATUS" -eq 1 ]; then
    echo "Existing installation detected"
    printf "Would you like to update? (y/N) "
    read -r REPLY
    echo
    if [ "$REPLY" = "y" ] || [ "$REPLY" = "Y" ]; then
        update_installation
        echo "Update complete!"
        echo "You can check the status with: systemctl status estimate-pro"
        echo "View logs with:"
        echo "  Application logs: tail -f /var/log/estimate-pro.log"
        echo "  Error logs: tail -f /var/log/estimate-pro.error.log"
        exit 0
    else
        echo "Update cancelled"
        exit 0
    fi
fi

# Continue with fresh installation
echo "Installing Estimate Pro..."

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

# Create initial admin user
echo "Creating initial admin user..."
cat > $APP_DIR/scripts/create-admin.js << EOL
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
const db = new Database(dbPath);

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync('admin123', salt);

try {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
    console.log('Admin user created successfully');
} catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
        console.log('Admin user already exists');
    } else {
        console.error('Error creating admin user:', error);
    }
}
db.close();
EOL

# Create the admin user
su estimatepro -c "cd $APP_DIR && node scripts/create-admin.js"

echo "Initial admin credentials:"
echo "Username: admin"
echo "Password: admin123"
echo "IMPORTANT: Please change these credentials after first login!"

echo "Installation complete!"
echo "Estimate Pro is now running as a service"
echo "You can check the status with: systemctl status estimate-pro"
echo "View logs with:"
echo "  Application logs: tail -f /var/log/estimate-pro.log"
echo "  Error logs: tail -f /var/log/estimate-pro.error.log"
echo "The application should be available at http://your-server:8080"
echo "Login with username: admin, password: admin123"

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
