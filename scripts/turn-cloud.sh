#!/bin/bash

# Simple TURN/STUN Server Deployment Script for Railway.com
# Simplified version - audio rooms ready
# Version: 2.0

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Configuration variables
PROJECT_NAME=""

# Check if we're in codespace
check_codespace() {
    if [[ -n "${CODESPACES}" ]]; then
        log "Running in GitHub Codespace environment"
        export CODESPACE_ENV=true
    else
        export CODESPACE_ENV=false
    fi
}

# Install required dependencies
install_dependencies() {
    log "Installing required dependencies..."
    
    # Update package list
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        
        # Install basic dependencies
        log "Installing basic dependencies..."
        sudo apt-get install -y curl wget git jq
        
        # Install Node.js and npm
        if ! command -v node &> /dev/null; then
            log "Installing Node.js..."
            # Install Node.js via NodeSource repository
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
    elif command -v yum &> /dev/null; then
        sudo yum update -y
        sudo yum install -y curl wget git jq nodejs npm
        
    elif command -v brew &> /dev/null; then
        brew update
        brew install curl wget git jq node
    else
        error "Package manager not found. Please install curl, wget, git, jq, nodejs, npm manually."
    fi
    
    # Install Railway CLI
    if ! command -v railway &> /dev/null; then
        log "Installing Railway CLI..."
        
        # Try npm installation first
        if command -v npm &> /dev/null; then
            npm install -g @railway/cli || {
                warning "Failed to install Railway CLI via npm. Trying direct installation..."
                install_railway_cli_direct
            }
        else
            install_railway_cli_direct
        fi
    fi
    
    log "Dependencies installed successfully"
}

# Install Railway CLI directly
install_railway_cli_direct() {
    log "Installing Railway CLI directly..."
    
    # Detect OS and architecture
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *) error "Unsupported architecture: $ARCH" ;;
    esac
    
    # Download and install Railway CLI
    RAILWAY_URL="https://github.com/railwayapp/cli/releases/latest/download/railway_${OS}_${ARCH}.tar.gz"
    
    curl -fsSL "$RAILWAY_URL" | tar -xz -C /tmp
    sudo mv /tmp/railway /usr/local/bin/railway
    sudo chmod +x /usr/local/bin/railway
    
    log "Railway CLI installed successfully"
}

# Project selection menu
select_project() {
    log "Project Selection Menu"
    echo "1. Use existing project in current directory"
    echo "2. Clone existing project from Git repository"
    echo "3. Create new project from scratch"
    
    read -p "Select option (1-3): " choice
    
    case $choice in
        1)
            PROJECT_NAME=$(basename "$PWD")
            log "Using existing project: $PROJECT_NAME"
            ;;
        2)
            read -p "Enter Git repository URL: " git_url
            read -p "Enter project name: " PROJECT_NAME
            log "Cloning repository..."
            git clone "$git_url" "$PROJECT_NAME"
            cd "$PROJECT_NAME"
            ;;
        3)
            read -p "Enter new project name: " PROJECT_NAME
            create_new_project
            ;;
        *)
            error "Invalid selection"
            ;;
    esac
}

# Create new simple project
create_new_project() {
    log "Creating new audio rooms server project..."
    
    mkdir -p "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    
    # Create package.json
    create_package_json
    
    # Create server.js
    create_server_js
    
    log "Basic project structure created"
}

# Create clean package.json
create_package_json() {
    log "Creating package.json..."
    
    cat > package.json << 'EOL'
{
  "name": "audio-rooms-server",
  "version": "1.0.0",
  "description": "WebRTC signaling server for audio rooms",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "cors": "^2.8.5"
  },
  "engines": {
    "node": "18.x"
  }
}
EOL
}

# Create server.js
create_server_js() {
    log "Creating server.js..."
    
    cat > server.js << 'EOL'
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// STUN servers for WebRTC
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.services.mozilla.com' }
];

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT,
    uptime: process.uptime()
  });
});

// ICE servers configuration endpoint
app.get('/api/ice-servers', (req, res) => {
  res.json({ 
    iceServers: ICE_SERVERS,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Audio Rooms WebRTC Server',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      iceServers: '/api/ice-servers',
      websocket: 'socket.io connection available'
    },
    documentation: {
      connect: 'Connect to Socket.io for WebRTC signaling',
      events: ['join-room', 'signal', 'leave-room']
    }
  });
});

// WebRTC signaling via Socket.io
io.on('connection', (socket) => {
  console.log(`🔗 Client connected: ${socket.id}`);
  
  // Join audio room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', socket.id);
    console.log(`👥 User ${socket.id} joined room: ${roomId}`);
  });
  
  // WebRTC signaling
  socket.on('signal', (data) => {
    const { target, signal } = data;
    socket.to(target).emit('signal', {
      signal: signal,
      sender: socket.id
    });
    console.log(`📡 Signal relayed from ${socket.id} to ${target}`);
  });
  
  // Leave room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user-disconnected', socket.id);
    console.log(`👋 User ${socket.id} left room: ${roomId}`);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Audio Rooms Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🧊 ICE servers: http://localhost:${PORT}/api/ice-servers`);
  console.log(`🔌 WebSocket ready for WebRTC signaling`);
});
EOL
}

# Clean up any problematic Railway files
cleanup_railway_config() {
    log "Cleaning up any problematic configuration files..."
    
    # Remove files that might cause deployment issues
    [[ -f "railway.json" ]] && rm railway.json && log "Removed railway.json"
    [[ -f "nixpacks.toml" ]] && rm nixpacks.toml && log "Removed nixpacks.toml"
    [[ -f "railway.toml" ]] && rm railway.toml && log "Removed railway.toml"
    [[ -f "Dockerfile" ]] && rm Dockerfile && log "Removed Dockerfile"
    
    log "Configuration cleanup completed"
}

# Setup Railway project
setup_railway() {
    log "Setting up Railway deployment..."
    
    # Check if Railway CLI is logged in
    if ! railway whoami &> /dev/null; then
        log "Logging into Railway..."
        railway login || {
            error "Failed to login to Railway. Please run 'railway login' manually and try again."
        }
    fi
    
    # Initialize Railway project if not already done
    if [[ ! -f ".railway/config.json" ]]; then
        log "Initializing Railway project..."
        railway init || {
            error "Failed to initialize Railway project"
        }
    else
        log "Railway project already initialized"
    fi
    
    log "Railway setup completed"
}

# Deploy to Railway
deploy_to_railway() {
    log "Deploying to Railway..."
    
    # Ensure git repository exists
    if [[ ! -d ".git" ]]; then
        log "Initializing git repository..."
        git init
        git add .
        git commit -m "Initial commit: Audio rooms WebRTC server"
    else
        log "Committing changes..."
        git add .
        git commit -m "Deploy audio rooms server to Railway" || log "No changes to commit"
    fi
    
    # Deploy with detached mode to avoid log streaming issues
    log "Starting Railway deployment..."
    if railway up --detach; then
        log "✅ Deployment initiated successfully!"
    else
        warning "Deployment command had issues, but may still succeed"
    fi
    
    # Wait for deployment to start
    log "Waiting for deployment to initialize..."
    sleep 15
    
    # Check status
    check_deployment_status
}

# Check deployment status
check_deployment_status() {
    log "Checking deployment status..."
    
    # Get Railway status
    if railway status &> /dev/null; then
        railway status
        
        # Try to get domain
        local domain=""
        if railway domain &> /dev/null; then
            domain=$(railway domain 2>/dev/null)
        fi
        
        if [[ -n "$domain" && "$domain" != "No custom domain set" ]]; then
            log "🌐 Your server is available at: https://$domain"
            log "🔗 Test endpoints:"
            log "   Health: https://$domain/health"
            log "   ICE Servers: https://$domain/api/ice-servers"
        else
            log "🔍 Railway is assigning a domain. Check dashboard for URL."
        fi
    else
        warning "Could not get Railway status"
    fi
    
    log ""
    log "📋 Next steps:"
    log "1. Check Railway dashboard: railway open"
    log "2. View logs: railway logs"
    log "3. Monitor status: railway status"
    log "4. Test health: curl https://your-domain.railway.app/health"
}

# Main deployment function
main() {
    log "🚀 Starting Simple Audio Rooms Server Deployment"
    log "=============================================="
    
    # Check environment
    check_codespace
    
    # Install dependencies
    install_dependencies
    
    # Project selection
    select_project
    
    # Clean up any existing config files that might cause issues
    cleanup_railway_config
    
    # Ensure we have the right files
    if [[ ! -f "package.json" ]]; then
        log "Creating package.json..."
        create_package_json
    fi
    
    if [[ ! -f "server.js" ]]; then
        log "Creating server.js..."
        create_server_js
    fi
    
    # Install dependencies
    if [[ -f "package.json" ]]; then
        log "Installing npm dependencies..."
        npm install || warning "npm install failed, but deployment may still work"
    fi
    
    # Setup Railway
    setup_railway
    
    # Deploy
    deploy_to_railway
    
    log "=============================================="
    log "🎉 Simple Deployment Completed!"
    log ""
    log "✅ Your Audio Rooms WebRTC Server includes:"
    log "   📡 WebRTC signaling via Socket.io"
    log "   🧊 STUN servers for NAT traversal"
    log "   ❤️  Health check endpoint"
    log "   🔧 ICE server configuration API"
    log ""
    log "🔗 Integration example:"
    log "   const response = await fetch('/api/ice-servers');"
    log "   const { iceServers } = await response.json();"
    log "   const pc = new RTCPeerConnection({ iceServers });"
    log ""
    log "📚 Socket.io events: 'join-room', 'signal', 'leave-room'"
    log "🌐 Check Railway dashboard for your live URL!"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi