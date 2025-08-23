#!/bin/bash

# STUN/TURN Server Deployment Script for Fly.io
# This script deploys a coturn server on Fly.io with credentials

set -e

# Configuration
APP_NAME="stun-server-$(date +%s)"
TURN_USERNAME="turnuser"
TURN_PASSWORD="$(openssl rand -base64 32)"
TURN_SECRET="$(openssl rand -base64 64)"
REALM="turnserver"

echo "🚀 Deploying STUN/TURN server on Fly.io"
echo "App name: $APP_NAME"
echo "Username: $TURN_USERNAME"
echo "Password: $TURN_PASSWORD"
echo "Secret: $TURN_SECRET"
echo "Realm: $REALM"

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ Not logged into Fly.io. Please run: flyctl auth login"
    exit 1
fi

# Create project directory
mkdir -p "$APP_NAME"
cd "$APP_NAME"

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    coturn \
    && rm -rf /var/lib/apt/lists/*

# Copy configuration
COPY turnserver.conf /etc/turnserver.conf

# Create user for coturn
RUN useradd -r -s /bin/false turnserver

# Create necessary directories
RUN mkdir -p /var/log/turn /var/lib/turn
RUN chown turnserver:turnserver /var/log/turn /var/lib/turn

EXPOSE 3478/udp 3478/tcp
EXPOSE 49152-65535/udp

CMD ["turnserver", "-c", "/etc/turnserver.conf", "-v"]
EOF

# Create coturn configuration
cat > turnserver.conf << EOF
# STUN/TURN server configuration

# Listening port for STUN/TURN
listening-port=3478

# External IP (will be set by Fly.io)
external-ip=\${FLY_PUBLIC_IP}

# Relay IP (same as external IP)
relay-ip=\${FLY_PUBLIC_IP}

# TURN server realm
realm=$REALM

# Enable STUN
stun-only=0

# Enable fingerprints in TURN messages
fingerprint

# Use long-term credentials mechanism
lt-cred-mech

# Static user credentials
user=$TURN_USERNAME:$TURN_PASSWORD

# Server name
server-name=$APP_NAME

# Use auth secret for time-limited credentials
use-auth-secret
static-auth-secret=$TURN_SECRET

# Allow TCP and UDP protocols
no-tcp-relay
no-tls
no-dtls

# Port range for relay endpoints
min-port=49152
max-port=65535

# Log file
log-file=/var/log/turn/turnserver.log

# Verbose logging (remove in production)
verbose

# Deny private IP ranges (security)
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=172.16.0.0-172.31.255.255

# Allow loopback
allow-loopback-peers

# No authentication for STUN
no-auth-stun

# CLI support
cli-port=5766
cli-ip=127.0.0.1
EOF

# Create fly.toml configuration
cat > fly.toml << EOF
app = "$APP_NAME"
primary_region = "ord"

[build]

[env]
  FLY_PUBLIC_IP = "0.0.0.0"

[http_service]
  internal_port = 3478
  force_https = false
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[services]]
  protocol = "udp"
  internal_port = 3478

  [[services.ports]]
    port = 3478

[[services]]
  protocol = "tcp"
  internal_port = 3478

  [[services.ports]]
    port = 3478

[[services]]
  protocol = "udp"
  internal_port = 49152
  
  [[services.ports]]
    port = 49152
    end_port = 65535

[vm]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
EOF

echo "📝 Created configuration files"

# Deploy to Fly.io
echo "🚀 Launching app on Fly.io..."
flyctl launch --copy-config --no-deploy

echo "🔧 Deploying..."
flyctl deploy

# Get the app URL
APP_URL=$(flyctl info --json | jq -r '.Hostname')

echo ""
echo "✅ STUN/TURN Server deployed successfully!"
echo ""
echo "🔗 Connection Details:"
echo "STUN URL: stun:$APP_URL:3478"
echo "TURN URL: turn:$APP_URL:3478"
echo ""
echo "🔐 Credentials:"
echo "Username: $TURN_USERNAME"
echo "Password: $TURN_PASSWORD"
echo "Secret: $TURN_SECRET"
echo "Realm: $REALM"
echo ""
echo "📋 WebRTC Configuration Example:"
echo "const iceServers = ["
echo "  { urls: 'stun:$APP_URL:3478' },"
echo "  {"
echo "    urls: 'turn:$APP_URL:3478',"
echo "    username: '$TURN_USERNAME',"
echo "    credential: '$TURN_PASSWORD'"
echo "  }"
echo "];"
echo ""
echo "🔍 Check logs with: flyctl logs -a $APP_NAME"
echo "📊 Check status with: flyctl status -a $APP_NAME"

# Save credentials to file
cat > credentials.txt << EOF
STUN/TURN Server Credentials
============================

App Name: $APP_NAME
STUN URL: stun:$APP_URL:3478
TURN URL: turn:$APP_URL:3478

Username: $TURN_USERNAME
Password: $TURN_PASSWORD
Secret: $TURN_SECRET
Realm: $REALM

WebRTC Configuration:
const iceServers = [
  { urls: 'stun:$APP_URL:3478' },
  {
    urls: 'turn:$APP_URL:3478',
    username: '$TURN_USERNAME',
    credential: '$TURN_PASSWORD'
  }
];
EOF

echo "💾 Credentials saved to credentials.txt"
echo ""
echo "🎉 Deployment complete!"