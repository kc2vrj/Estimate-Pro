# Requires -RunAsAdministrator

# Error handling
$ErrorActionPreference = "Stop"

Write-Host "Checking Estimate-Pro installation..."

# Function to check if a command exists
function Test-Command($CommandName) {
    return $null -ne (Get-Command $CommandName -ErrorAction SilentlyContinue)
}

# Function to check if service exists
function Test-ServiceExists {
    return Get-Service "EstimatePro" -ErrorAction SilentlyContinue
}

# Function to backup database
function Backup-Database {
    $BackupDir = "C:\Program Files\EstimatePro\backups"
    $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    
    Write-Host "Creating database backup..."
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir | Out-Null
    }
    
    if (Test-Path "C:\Program Files\EstimatePro\data\estimates.db") {
        Copy-Item "C:\Program Files\EstimatePro\data\estimates.db" "$BackupDir\estimates_$Timestamp.db"
        Write-Host "Database backed up to $BackupDir\estimates_$Timestamp.db"
    }
}

# Function to update existing installation
function Update-EstimatePro {
    param (
        [string]$AppDir
    )
    
    Write-Host "Updating Estimate Pro..."
    
    # Stop the service
    Stop-Service "EstimatePro" -ErrorAction SilentlyContinue
    
    # Backup database
    Backup-Database
    
    # Update repository
    Set-Location $AppDir
    git pull
    
    # Update npm dependencies
    npm install --legacy-peer-deps
    
    # Update npm to latest version
    npm install -g npm@latest
    
    # Run migrations if they exist
    if (Test-Path "$AppDir\scripts\migrate.js") {
        Write-Host "Running database migrations..."
        node scripts/migrate.js
    }
    
    # Rebuild the application
    npm run build
    
    # Restart the service
    Start-Service "EstimatePro"
    
    Write-Host "Update completed successfully"
}

# Check if Estimate Pro is already installed
$AppDir = "C:\Program Files\EstimatePro"
$service = Test-ServiceExists

if ($service) {
    Write-Host "Existing installation detected"
    $confirmation = Read-Host "Would you like to update? (y/n)"
    if ($confirmation -eq 'y') {
        Update-EstimatePro -AppDir $AppDir
        Write-Host "`nUpdate complete!"
        Write-Host "You can manage the service in Windows Services (services.msc)"
        Write-Host "The application should be available at http://localhost:8080"
        exit 0
    } else {
        Write-Host "Update cancelled"
        exit 0
    }
}

# Continue with fresh installation
Write-Host "Installing Estimate Pro..."

try {
    # Install Chocolatey (Windows package manager)
    function Install-Chocolatey {
        if (-not (Test-Command "choco")) {
            Write-Host "Installing Chocolatey..."
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
            refreshenv
        }
    }

    # Install required software
    function Install-NodeJS {
        if (-not (Test-Command "node")) {
            Write-Host "Installing Node.js..."
            choco install nodejs-lts -y
            refreshenv
        }
    }

    function Install-Git {
        if (-not (Test-Command "git")) {
            Write-Host "Installing Git..."
            choco install git -y
            refreshenv
        }
    }

    function Install-Python {
        if (-not (Test-Command "python")) {
            Write-Host "Installing Python..."
            choco install python3 -y
            refreshenv
        }
    }

    Install-Chocolatey
    Install-NodeJS
    Install-Git
    Install-Python

    # Set up application directory
    if (-not (Test-Path $AppDir)) {
        New-Item -ItemType Directory -Path $AppDir | Out-Null
    }

    # Clone the repository
    if (-not (Test-Path "$AppDir\.git")) {
        Write-Host "Cloning repository..."
        git clone https://github.com/kc2vrj/Estimate-Pro.git $AppDir
    }

    # Install npm dependencies
    Write-Host "Installing npm dependencies..."
    Set-Location $AppDir
    npm install --legacy-peer-deps

    # Create data directory
    $DataDir = Join-Path $AppDir "data"
    if (-not (Test-Path $DataDir)) {
        New-Item -ItemType Directory -Path $DataDir | Out-Null
    }

    # Setup the database
    Write-Host "Setting up database..."
    npm run setup

    # Build the application
    Write-Host "Building application..."
    npm run build

    # Install as Windows service
    function Install-WindowsService {
        param (
            [string]$AppDir
        )
        
        # Install node-windows globally
        Write-Host "Installing node-windows..."
        npm install -g node-windows

        # Create service installation script
        $serviceScript = @"
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
    name: 'EstimatePro',
    description: 'Estimate Pro Application Service',
    script: path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next'),
    nodeOptions: ['--harmony', '--max_old_space_size=4096'],
    env: [{
        name: "NODE_ENV",
        value: "production"
    }, {
        name: "PORT",
        value: "8080"
    }]
});

svc.on('install', function() {
    svc.start();
    console.log('Service installed and started successfully');
});

svc.install();
"@

        $serviceScript | Out-File -FilePath "$AppDir\install-service.js" -Encoding UTF8
        
        # Install and start the service
        Write-Host "Installing Windows service..."
        Set-Location $AppDir
        node install-service.js
    }

    Install-WindowsService -AppDir $AppDir

    # Configure Windows Firewall
    Write-Host "Configuring firewall..."
    New-NetFirewallRule -DisplayName "EstimatePro" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080

    Write-Host "`nInstallation complete!"
    Write-Host "Estimate Pro is now running as a Windows service"
    Write-Host "You can manage the service in Windows Services (services.msc)"
    Write-Host "The application should be available at http://localhost:8080"
    Write-Host "Login with username: admin, password: admin123"

} catch {
    Write-Host "An error occurred during installation:"
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
