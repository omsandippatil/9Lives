#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

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

success() {
    echo -e "${PURPLE}[SUCCESS] $1${NC}"
}

PROJECT_NAME="railway-turn-audio-server"
TURN_SECRET=""
TURN_USERNAME="audiouser"
TURN_PASSWORD=""

generate_credentials() {
    TURN_SECRET=$(openssl rand -hex 32)
    TURN_PASSWORD=$(openssl rand -hex 16)
}

install_dependencies() {
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -y
        sudo apt-get install -y curl wget git jq openssl build-essential pkg-config libssl-dev libevent-dev sqlite3 libsqlite3-dev coturn
        
        if ! command -v node &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
    elif command -v yum &> /dev/null; then
        sudo yum update -y
        sudo yum groupinstall -y "Development Tools"
        sudo yum install -y curl wget git jq openssl openssl-devel libevent-devel sqlite-devel nodejs npm epel-release coturn
        
    elif command -v brew &> /dev/null; then
        brew update
        brew install curl wget git jq openssl libevent sqlite node coturn
    else
        error "Package manager not found"
    fi
    
    if ! command -v railway &> /dev/null; then
        npm install -g @railway/cli || install_railway_cli_direct
    fi
}

configure_coturn() {
    sudo tee /etc/turnserver.conf > /dev/null << EOF
listening-port=${PORT:-3478}
tls-listening-port=$((PORT + 1))
listening-ip=0.0.0.0
relay-ip=0.0.0.0
external-ip=\$(curl -s https://api.ipify.org)

lt-cred-mech
use-auth-secret
static-auth-secret=${TURN_SECRET}

server-name=railway-turn-server
realm=railway.app
total-quota=100
bps-capacity=0
stale-nonce=600

fingerprint
no-multicast-peers
no-cli
no-loopback-peers
no-stdout-log

userdb=/tmp/turndb
verbose
EOF

    sudo chmod 644 /etc/turnserver.conf
    
    sudo tee /etc/systemd/system/coturn-railway.service > /dev/null << EOF
[Unit]
Description=Coturn TURN Server for Railway
After=network.target

[Service]
Type=simple
User=turnserver
ExecStart=/usr/bin/turnserver -c /etc/turnserver.conf
Restart=always
RestartSec=3
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

    if ! id turnserver &>/dev/null; then
        sudo useradd -r -s /bin/false turnserver
    fi

    sudo systemctl daemon-reload
    sudo systemctl enable coturn-railway
    sudo systemctl start coturn-railway
}

install_railway_cli_direct() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *) error "Unsupported architecture: $ARCH" ;;
    esac
    
    RAILWAY_URL="https://github.com/railwayapp/cli/releases/latest/download/railway_${OS}_${ARCH}.tar.gz"
    
    curl -fsSL "$RAILWAY_URL" | tar -xz -C /tmp
    sudo mv /tmp/railway /usr/local/bin/railway
    sudo chmod +x /usr/local/bin/railway
}

create_project() {
    mkdir -p "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    
    generate_credentials
    
    if command -v turnserver &> /dev/null; then
        configure_coturn
    fi
    
    create_package_json
    create_turn_server
    create_railway_configs
    create_dockerfile
    create_environment_files
}

create_package_json() {
    cat > package.json << 'EOL'
{
  "name": "railway-turn-audio-server",
  "version": "4.0.0",
  "description": "Full TURN/STUN server with single audio room support for Railway",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "NODE_ENV=development node server.js",
    "build": "echo 'No build step required'",
    "test": "node test-connection.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.5",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "helmet": "^7.1.0",
    "ws": "^8.14.2",
    "uuid": "^9.0.1",
    "dgram": "^1.0.1",
    "net": "^1.0.2"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "webrtc",
    "turn",
    "stun", 
    "audio",
    "railway"
  ],
  "license": "MIT"
}
EOL
}

create_turn_server() {
    cat > server.js << 'EOL'
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const dgram = require('dgram');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'production';

const TURN_SECRET = process.env.TURN_SECRET || crypto.randomBytes(32).toString('hex');
const TURN_USERNAME = process.env.TURN_USERNAME || 'audiouser';
const TURN_PASSWORD = process.env.TURN_PASSWORD || crypto.randomBytes(16).toString('hex');
const TURN_TTL = 86400;

class SimpleTURNServer {
  constructor(port) {
    this.port = port;
    this.socket = dgram.createSocket('udp4');
    this.clients = new Map();
    this.relays = new Map();
  }

  start() {
    this.socket.bind(this.port, () => {
      console.log(`TURN server listening on UDP port ${this.port}`);
    });

    this.socket.on('message', (msg, rinfo) => {
      this.handleSTUNMessage(msg, rinfo);
    });

    this.socket.on('error', (err) => {
      console.error('TURN server error:', err);
    });
  }

  handleSTUNMessage(msg, rinfo) {
    try {
      if (msg.length < 20) return;

      const messageType = msg.readUInt16BE(0);
      const messageLength = msg.readUInt16BE(2);
      const magicCookie = msg.readUInt32BE(4);

      if (magicCookie !== 0x2112A442) return;

      if (messageType === 0x0001) {
        this.sendBindingResponse(msg, rinfo);
      } else if (messageType === 0x0003) {
        this.handleAllocateRequest(msg, rinfo);
      }
    } catch (error) {
      console.error('STUN message handling error:', error);
    }
  }

  sendBindingResponse(request, rinfo) {
    const response = Buffer.alloc(32);
    
    response.writeUInt16BE(0x0101, 0);
    response.writeUInt16BE(12, 2);
    response.writeUInt32BE(0x2112A442, 4);
    request.copy(response, 8, 8, 20);
    
    response.writeUInt16BE(0x0020, 20);
    response.writeUInt16BE(8, 22);
    response.writeUInt16BE(0x0001, 24);
    response.writeUInt16BE(rinfo.port, 26);
    response.writeUInt32BE(this.ipToInt(rinfo.address), 28);

    this.socket.send(response, rinfo.port, rinfo.address);
  }

  handleAllocateRequest(request, rinfo) {
    const clientKey = `${rinfo.address}:${rinfo.port}`;
    const relayPort = 49152 + Math.floor(Math.random() * 16383);
    
    this.relays.set(clientKey, {
      relayPort: relayPort,
      clientAddress: rinfo.address,
      clientPort: rinfo.port,
      allocated: Date.now()
    });

    const response = Buffer.alloc(56);
    response.writeUInt16BE(0x0103, 0);
    response.writeUInt16BE(36, 2);
    response.writeUInt32BE(0x2112A442, 4);
    request.copy(response, 8, 8, 20);
    
    response.writeUInt16BE(0x0016, 20);
    response.writeUInt16BE(8, 22);
    response.writeUInt16BE(0x0001, 24);
    response.writeUInt16BE(relayPort, 26);
    response.writeUInt32BE(this.ipToInt('0.0.0.0'), 28);
    
    response.writeUInt16BE(0x000D, 32);
    response.writeUInt16BE(4, 34);
    response.writeUInt32BE(600, 36);

    this.socket.send(response, rinfo.port, rinfo.address);
  }

  ipToInt(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }
}

const getICEServers = (username, credential) => {
  const baseServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  if (username && credential) {
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost';
    baseServers.push({
      urls: `turn:${domain}:3478`,
      username: username,
      credential: credential
    });
  }

  return baseServers;
};

const generateTURNCredentials = () => {
  const timestamp = Math.floor(Date.now() / 1000) + TURN_TTL;
  const username = `${timestamp}:${TURN_USERNAME}`;
  const credential = crypto
    .createHmac('sha1', TURN_SECRET)
    .update(username)
    .digest('base64');
    
  return { username, credential, timestamp };
};

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({ origin: "*" }));
app.use(express.json());

const AUDIO_ROOM_ID = 'main-audio-room';
const audioRoom = {
  users: new Map(),
  maxUsers: 50,
  created: new Date().toISOString(),
  lastActivity: new Date().toISOString()
};

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'Railway TURN Audio Server',
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    audioRoom: {
      users: audioRoom.users.size,
      maxUsers: audioRoom.maxUsers
    }
  });
});

app.get('/api/ice-servers', (req, res) => {
  const turnCreds = generateTURNCredentials();
  const iceServers = getICEServers(turnCreds.username, turnCreds.credential);
  
  res.json({
    iceServers: iceServers,
    turnCredentials: {
      username: turnCreds.username,
      credential: turnCreds.credential,
      ttl: TURN_TTL
    }
  });
});

app.get('/api/audio-room', (req, res) => {
  res.json({
    roomId: AUDIO_ROOM_ID,
    connectedUsers: audioRoom.users.size,
    maxUsers: audioRoom.maxUsers,
    userList: Array.from(audioRoom.users.keys())
  });
});

app.get('/', (req, res) => {
  const domain = req.get('host');
  
  res.json({
    name: 'Railway TURN Audio Server',
    status: 'running',
    version: '4.0.0',
    audioRoom: {
      id: AUDIO_ROOM_ID,
      connectedUsers: audioRoom.users.size,
      maxUsers: audioRoom.maxUsers,
      webSocketUrl: `${req.protocol}://${domain}`
    },
    endpoints: {
      health: '/health',
      iceServers: '/api/ice-servers',
      audioRoom: '/api/audio-room'
    },
    webrtc: {
      stunServers: [`stun:${domain}:3478`, 'stun:stun.l.google.com:19302']
    }
  });
});

io.on('connection', (socket) => {
  let userInfo = null;
  
  socket.on('join-audio-room', (data = {}) => {
    if (audioRoom.users.size >= audioRoom.maxUsers) {
      socket.emit('room-full', {
        message: 'Audio room at maximum capacity',
        maxUsers: audioRoom.maxUsers
      });
      return;
    }
    
    userInfo = {
      id: socket.id,
      nickname: data.nickname || `User${Math.floor(Math.random() * 1000)}`,
      joinedAt: new Date().toISOString(),
      muted: data.muted || false
    };
    
    audioRoom.users.set(socket.id, userInfo);
    audioRoom.lastActivity = new Date().toISOString();
    
    socket.join(AUDIO_ROOM_ID);
    
    const turnCreds = generateTURNCredentials();
    
    socket.emit('audio-room-joined', {
      roomId: AUDIO_ROOM_ID,
      userInfo: userInfo,
      connectedUsers: Array.from(audioRoom.users.values()),
      iceServers: getICEServers(turnCreds.username, turnCreds.credential),
      turnCredentials: turnCreds
    });
    
    socket.to(AUDIO_ROOM_ID).emit('user-joined', {
      user: userInfo,
      totalUsers: audioRoom.users.size
    });
  });
  
  socket.on('audio-signal', (data) => {
    const { target, signal, type } = data;
    
    if (!target || !signal) {
      socket.emit('error', { message: 'Invalid signal data' });
      return;
    }
    
    if (!audioRoom.users.has(socket.id) || !audioRoom.users.has(target)) {
      socket.emit('error', { message: 'Users not in audio room' });
      return;
    }
    
    socket.to(target).emit('audio-signal', {
      signal: signal,
      sender: socket.id,
      type: type || 'unknown'
    });
  });
  
  socket.on('mute-audio', (muted) => {
    if (userInfo && audioRoom.users.has(socket.id)) {
      userInfo.muted = muted;
      audioRoom.users.set(socket.id, userInfo);
      
      socket.to(AUDIO_ROOM_ID).emit('audio-state-changed', {
        userId: socket.id,
        muted: muted
      });
    }
  });
  
  socket.on('leave-audio-room', () => {
    leaveAudioRoom(socket);
  });
  
  socket.on('disconnect', () => {
    leaveAudioRoom(socket);
  });
  
  function leaveAudioRoom(socket) {
    if (userInfo && audioRoom.users.has(socket.id)) {
      audioRoom.users.delete(socket.id);
      audioRoom.lastActivity = new Date().toISOString();
      
      socket.leave(AUDIO_ROOM_ID);
      
      socket.to(AUDIO_ROOM_ID).emit('user-left', {
        userId: socket.id,
        nickname: userInfo.nickname,
        totalUsers: audioRoom.users.size
      });
      
      userInfo = null;
    }
  }
});

const turnServer = new SimpleTURNServer(3478);

server.on('error', (error) => {
  console.error('Server error:', error);
});

const gracefulShutdown = () => {
  io.emit('server-shutdown', {
    message: 'Server shutting down'
  });
  
  server.close(() => {
    process.exit(0);
  });
  
  setTimeout(() => {
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(PORT, HOST, () => {
  console.log(`Railway TURN Audio Server running on ${HOST}:${PORT}`);
  console.log(`Audio room: ${AUDIO_ROOM_ID} (max ${audioRoom.maxUsers} users)`);
  
  turnServer.start();
  
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    console.log(`Public URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }
});
EOL
}

create_railway_configs() {
    cat > nixpacks.toml << 'EOL'
[phases.setup]
nixPkgs = ["nodejs-20_x", "npm-10_x", "openssl", "sqlite", "coturn"]

[phases.build]
cmds = ["npm ci --production"]

[phases.start]
cmd = "npm start"

[variables]
NODE_ENV = "production"
EOL

    cat > .railwayignore << 'EOL'
node_modules
.git
.gitignore
README.md
.env.local
*.log
test-*
.vscode/
.idea/
EOL

    cat > start.sh << 'EOL'
#!/bin/bash
export NODE_ENV=production
export UV_THREADPOOL_SIZE=128

if command -v turnserver &> /dev/null && [[ -f /etc/turnserver.conf ]]; then
    turnserver -c /etc/turnserver.conf &
fi

exec node server.js
EOL

    chmod +x start.sh
}

create_dockerfile() {
    cat > Dockerfile << 'EOL'
FROM node:20-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl \
    sqlite \
    coturn

WORKDIR /app

COPY package*.json ./
RUN npm ci --production && npm cache clean --force

COPY . .

RUN addgroup -g 1001 -S nodejs
RUN adduser -S audioserver -u 1001
RUN chown -R audioserver:nodejs /app

USER audioserver

EXPOSE 3000 3478 3479

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]
EOL
}

create_environment_files() {
    cat > .env.example << 'EOL'
NODE_ENV=production
PORT=3000
TURN_SECRET=your-turn-secret-here
TURN_USERNAME=audiouser
TURN_PASSWORD=your-turn-password-here
EOL

    cat > .env << EOF
NODE_ENV=production
PORT=3000
TURN_SECRET=${TURN_SECRET}
TURN_USERNAME=${TURN_USERNAME}
TURN_PASSWORD=${TURN_PASSWORD}
EOF
}

create_test_connection() {
    cat > test-connection.js << 'EOL'
const io = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

console.log(`Testing connection to: ${SERVER_URL}`);

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  timeout: 10000
});

socket.on('connect', () => {
  console.log('Connected to server');
  
  socket.emit('join-audio-room', {
    nickname: 'TestUser',
    muted: false
  });
});

socket.on('audio-room-joined', (data) => {
  console.log('Successfully joined audio room:', data.roomId);
  console.log(`Connected users: ${data.connectedUsers.length}`);
  console.log('ICE Servers available:', data.iceServers.length);
  
  setTimeout(() => {
    socket.emit('leave-audio-room');
    setTimeout(() => {
      socket.disconnect();
      console.log('Test completed successfully');
      process.exit(0);
    }, 1000);
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Test timeout');
  process.exit(1);
}, 15000);
EOL
}

setup_railway() {
    if ! railway whoami &> /dev/null; then
        railway login || error "Failed to authenticate with Railway"
    fi
    
    if [[ ! -f ".railway/config.json" ]]; then
        railway init || error "Failed to initialize Railway project"
    fi
    
    # Link or create a service
    if ! railway service &> /dev/null; then
        log "Creating and linking service..."
        railway service create --name "turn-audio-server" || railway add || error "Failed to create service"
    fi
    
    railway variables --set "NODE_ENV=production" --set "TURN_SECRET=$TURN_SECRET" --set "TURN_USERNAME=$TURN_USERNAME" --set "TURN_PASSWORD=$TURN_PASSWORD"
    
    read -p "Enter custom domain (optional): " custom_domain
    if [[ -n "$custom_domain" ]]; then
        railway domain add "$custom_domain" || railway domain "$custom_domain" || warning "Failed to set custom domain"
    fi
}

deploy_to_railway() {
    if [[ ! -d ".git" ]]; then
        git init
        git branch -M main
        
        cat > .gitignore << 'EOL'
node_modules/
.env
*.log
.DS_Store
.vscode/
.idea/
EOL
    fi
    
    git add .
    git commit -m "Deploy Railway TURN audio server v4.0" || true
    
    railway up --detach
    
    sleep 30
    
    check_deployment_success
}

check_deployment_success() {
    local domain=""
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if railway status | grep -q "Deployed"; then
            break
        fi
        sleep 10
        ((attempt++))
    done
    
    if railway domain &> /dev/null; then
        domain=$(railway domain 2>/dev/null | grep -v "No custom domain" | head -1)
    fi
    
    if [[ -z "$domain" || "$domain" == "No custom domain set" ]]; then
        domain=$(railway logs --limit 5 | grep -o 'https://[^/]*\.railway\.app' | head -1 | sed 's/https:\/\///')
    fi
    
    if [[ -n "$domain" ]]; then
        local base_url="https://$domain"
        
        success "TURN Audio Server deployed successfully!"
        log "Server URL: $base_url"
        log "Health Check: $base_url/health"
        log "ICE Servers: $base_url/api/ice-servers"
        log "Audio Room: $base_url/api/audio-room"
        
        if command -v curl &> /dev/null; then
            test_endpoint "$base_url/health" "Health Check"
            test_endpoint "$base_url/api/ice-servers" "ICE Servers"
        fi
        
        create_test_connection
        log "Test connection: npm test"
        
    else
        warning "Unable to determine deployment domain"
        railway status
    fi
}

test_endpoint() {
    local url="$1"
    local name="$2"
    
    if curl -s --max-time 10 "$url" > /dev/null 2>&1; then
        log "$name: OK"
    else
        warning "$name: Failed"
    fi
}

create_readme() {
    cat > README.md << 'EOL'
# Railway TURN Audio Server

Complete TURN/STUN server with single audio room support for Railway deployment.

## Quick Deploy

```bash
chmod +x deploy-turn-server.sh
./deploy-turn-server.sh
```

## API Endpoints

- `GET /` - Server info
- `GET /health` - Health check
- `GET /api/ice-servers` - ICE servers with TURN credentials
- `GET /api/audio-room` - Audio room info

## WebSocket Events

### Client Events
- `join-audio-room` - Join audio room
- `audio-signal` - WebRTC signaling
- `mute-audio` - Toggle mute
- `leave-audio-room` - Leave room

### Server Events
- `audio-room-joined` - Room join confirmation
- `user-joined` - User joined notification
- `user-left` - User left notification
- `audio-signal` - WebRTC signal relay

## Usage

```javascript
const socket = io('https://your-app.railway.app');

socket.emit('join-audio-room', {
  nickname: 'Your Name'
});

socket.on('audio-room-joined', (data) => {
  const pc = new RTCPeerConnection({
    iceServers: data.iceServers
  });
});
```

## Environment Variables

- `NODE_ENV` - Environment
- `PORT` - Server port
- `TURN_SECRET` - TURN secret
- `TURN_USERNAME` - TURN username
- `TURN_PASSWORD` - TURN password
EOL
}

main() {
    log "Railway TURN Audio Server Deployment Script v4.0"
    
    if ! command -v railway &> /dev/null; then
        install_dependencies
    fi
    
    if [[ -f "package.json" && -f "server.js" ]]; then
        PROJECT_NAME=$(basename "$PWD")
    else
        create_project
    fi
    
    if [[ -f "package.json" ]]; then
        npm install || error "Failed to install npm dependencies"
    fi
    
    create_test_connection
    create_readme
    
    setup_railway
    deploy_to_railway
    
    success "Railway TURN Audio Server deployment complete!"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi