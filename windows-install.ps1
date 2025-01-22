# Requires -RunAsAdministrator

# Error handling
$ErrorActionPreference = "Stop"

Write-Host "Starting Estimate-Pro installation..."

# Function to check if a command exists
function Test-Command($CommandName) {
    return $null -ne (Get-Command $CommandName -ErrorAction SilentlyContinue)
}

# Function to install Chocolatey
function Install-Chocolatey {
    if (-not (Test-Command "choco")) {
        Write-Host "Installing Chocolatey..."
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
        refreshenv
    }
}

# Function to install Node.js
function Install-NodeJS {
    if (-not (Test-Command "node")) {
        Write-Host "Installing Node.js..."
        choco install nodejs-lts -y
        refreshenv
    }
}

# Function to install Git
function Install-Git {
    if (-not (Test-Command "git")) {
        Write-Host "Installing Git..."
        choco install git -y
        refreshenv
    }
}

# Function to install Python
function Install-Python {
    if (-not (Test-Command "python")) {
        Write-Host "Installing Python..."
        choco install python3 -y
        refreshenv
    }
}

# Function to create Windows service
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
    cd $AppDir
    node install-service.js
}

try {
    # Install Chocolatey (Windows package manager)
    Install-Chocolatey

    # Install required software
    Install-NodeJS
    Install-Git
    Install-Python

    # Set up application directory
    $AppDir = "C:\Program Files\EstimatePro"
    if (-not (Test-Path $AppDir)) {
        New-Item -ItemType Directory -Path $AppDir | Out-Null
    }

    # Clone the repository
    if (-not (Test-Path "$AppDir\.git")) {
        Write-Host "Cloning repository..."
        git clone https://github.com/kc2vrj/Estimate-Pro.git $AppDir
    } else {
        Write-Host "Updating existing repository..."
        Set-Location $AppDir
        git pull
    }

    # Install npm dependencies
    Write-Host "Installing npm dependencies..."
    Set-Location $AppDir
    npm install

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
    Install-WindowsService -AppDir $AppDir

    # Configure Windows Firewall
    Write-Host "Configuring firewall..."
    New-NetFirewallRule -DisplayName "EstimatePro" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080

    Write-Host "`nInstallation complete!"
    Write-Host "Estimate Pro is now running as a Windows service"
    Write-Host "You can manage the service in Windows Services (services.msc)"
    Write-Host "The application should be available at http://localhost:8080"

} catch {
    Write-Host "An error occurred during installation:"
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
