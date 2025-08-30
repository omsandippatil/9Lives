#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
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
        sudo apt-get install -y curl wget git openssl coturn
        
        if ! command -v node &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
    elif command -v yum &> /dev/null; then
        sudo yum update -y
        sudo yum install -y curl wget git openssl nodejs npm coturn
        
    elif command -v brew &> /dev/null; then
        brew install curl wget git openssl node coturn
    else
        error "Package manager not found"
    fi
    
    if ! command -v railway &> /dev/null; then
        npm install -g @railway/cli
    fi
}

create_project() {
    mkdir -p "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    
    generate_credentials
    
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
  "version": "1.0.0",
  "description": "Full TURN server with audio relay for Railway",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.5",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "helmet": "^7.1.0",
    "uuid": "^9.0.1",
    "dgram": "^1.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
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
const TURN_PORT = process.env.TURN_PORT || 3478;
const HOST = '0.0.0.0';

const TURN_SECRET = process.env.TURN_SECRET || crypto.randomBytes(32).toString('hex');
const TURN_USERNAME = process.env.TURN_USERNAME || 'audiouser';
const TURN_PASSWORD = process.env.TURN_PASSWORD || crypto.randomBytes(16).toString('hex');
const TURN_TTL = 86400;

class TURNServer {
  constructor(port) {
    this.port = port;
    this.socket = dgram.createSocket('udp4');
    this.allocations = new Map();
    this.permissions = new Map();
    this.channels = new Map();
    this.relaySocket = dgram.createSocket('udp4');
    
    this.setupRelaySocket();
  }

  setupRelaySocket() {
    this.relaySocket.bind(0, () => {
      this.relayPort = this.relaySocket.address().port;
    });

    this.relaySocket.on('message', (msg, rinfo) => {
      this.handleRelayMessage(msg, rinfo);
    });
  }

  start() {
    this.socket.bind(this.port, HOST, () => {
      log(`TURN server started on ${HOST}:${this.port}`);
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
      const transactionId = msg.subarray(8, 20);

      if (magicCookie !== 0x2112A442) return;

      switch (messageType) {
        case 0x0001:
          this.sendBindingResponse(transactionId, rinfo);
          break;
        case 0x0003:
          this.handleAllocateRequest(msg, transactionId, rinfo);
          break;
        case 0x0004:
          this.handleRefreshRequest(msg, transactionId, rinfo);
          break;
        case 0x0006:
          this.handleSendIndication(msg, rinfo);
          break;
        case 0x0008:
          this.handleChannelBind(msg, transactionId, rinfo);
          break;
      }
    } catch (error) {
      console.error('STUN message error:', error);
    }
  }

  sendBindingResponse(transactionId, rinfo) {
    const response = Buffer.alloc(32);
    
    response.writeUInt16BE(0x0101, 0);
    response.writeUInt16BE(12, 2);
    response.writeUInt32BE(0x2112A442, 4);
    transactionId.copy(response, 8);
    
    response.writeUInt16BE(0x0020, 20);
    response.writeUInt16BE(8, 22);
    response.writeUInt8(0x00, 24);
    response.writeUInt8(0x01, 25);
    response.writeUInt16BE(rinfo.port, 26);
    response.writeUInt32BE(this.ipToInt(rinfo.address), 28);

    this.socket.send(response, rinfo.port, rinfo.address);
  }

  handleAllocateRequest(msg, transactionId, rinfo) {
    const allocation = {
      clientAddress: rinfo.address,
      clientPort: rinfo.port,
      relayAddress: '0.0.0.0',
      relayPort: this.relayPort + Math.floor(Math.random() * 1000),
      lifetime: 600,
      allocated: Date.now()
    };

    const allocationKey = `${rinfo.address}:${rinfo.port}`;
    this.allocations.set(allocationKey, allocation);

    const response = Buffer.alloc(64);
    response.writeUInt16BE(0x0103, 0);
    response.writeUInt16BE(44, 2);
    response.writeUInt32BE(0x2112A442, 4);
    transactionId.copy(response, 8);
    
    response.writeUInt16BE(0x0016, 20);
    response.writeUInt16BE(8, 22);
    response.writeUInt8(0x00, 24);
    response.writeUInt8(0x01, 25);
    response.writeUInt16BE(allocation.relayPort, 26);
    response.writeUInt32BE(this.ipToInt(allocation.relayAddress), 28);
    
    response.writeUInt16BE(0x000D, 32);
    response.writeUInt16BE(4, 34);
    response.writeUInt32BE(allocation.lifetime, 36);
    
    response.writeUInt16BE(0x0022, 40);
    response.writeUInt16BE(8, 42);
    response.writeUInt32BE(0x7F000001, 44);
    response.writeUInt32BE(0x00000000, 48);

    this.socket.send(response, rinfo.port, rinfo.address);
  }

  handleRefreshRequest(msg, transactionId, rinfo) {
    const allocationKey = `${rinfo.address}:${rinfo.port}`;
    const allocation = this.allocations.get(allocationKey);

    if (!allocation) {
      this.sendErrorResponse(transactionId, rinfo, 437, 'Allocation Mismatch');
      return;
    }

    allocation.allocated = Date.now();

    const response = Buffer.alloc(32);
    response.writeUInt16BE(0x0104, 0);
    response.writeUInt16BE(12, 2);
    response.writeUInt32BE(0x2112A442, 4);
    transactionId.copy(response, 8);
    
    response.writeUInt16BE(0x000D, 20);
    response.writeUInt16BE(4, 22);
    response.writeUInt32BE(allocation.lifetime, 24);

    this.socket.send(response, rinfo.port, rinfo.address);
  }

  handleSendIndication(msg, rinfo) {
    try {
      let offset = 20;
      let peerAddress = null;
      let peerPort = null;
      let data = null;

      while (offset < msg.length) {
        const attrType = msg.readUInt16BE(offset);
        const attrLength = msg.readUInt16BE(offset + 2);
        const attrValue = msg.subarray(offset + 4, offset + 4 + attrLength);

        if (attrType === 0x0012) {
          peerPort = attrValue.readUInt16BE(2);
          peerAddress = `${attrValue[4]}.${attrValue[5]}.${attrValue[6]}.${attrValue[7]}`;
        } else if (attrType === 0x0013) {
          data = attrValue;
        }

        offset += 4 + attrLength;
        if (attrLength % 4 !== 0) {
          offset += 4 - (attrLength % 4);
        }
      }

      if (peerAddress && peerPort && data) {
        this.relaySocket.send(data, peerPort, peerAddress);
      }
    } catch (error) {
      console.error('Send indication error:', error);
    }
  }

  handleChannelBind(msg, transactionId, rinfo) {
    const response = Buffer.alloc(20);
    response.writeUInt16BE(0x0109, 0);
    response.writeUInt16BE(0, 2);
    response.writeUInt32BE(0x2112A442, 4);
    transactionId.copy(response, 8);

    this.socket.send(response, rinfo.port, rinfo.address);
  }

  handleRelayMessage(msg, rinfo) {
    for (const [key, allocation] of this.allocations) {
      if (allocation.relayPort === rinfo.port) {
        const [clientAddr, clientPort] = key.split(':');
        
        const indication = Buffer.alloc(32 + msg.length);
        indication.writeUInt16BE(0x0017, 0);
        indication.writeUInt16BE(16 + msg.length, 2);
        indication.writeUInt32BE(0x2112A442, 4);
        crypto.randomBytes(12).copy(indication, 8);
        
        indication.writeUInt16BE(0x0012, 20);
        indication.writeUInt16BE(8, 22);
        indication.writeUInt8(0x00, 24);
        indication.writeUInt8(0x01, 25);
        indication.writeUInt16BE(rinfo.port, 26);
        indication.writeUInt32BE(this.ipToInt(rinfo.address), 28);
        
        indication.writeUInt16BE(0x0013, 32);
        indication.writeUInt16BE(msg.length, 34);
        msg.copy(indication, 36);

        this.socket.send(indication, parseInt(clientPort), clientAddr);
        break;
      }
    }
  }

  sendErrorResponse(transactionId, rinfo, errorCode, errorPhrase) {
    const response = Buffer.alloc(32);
    response.writeUInt16BE(0x0111, 0);
    response.writeUInt16BE(12, 2);
    response.writeUInt32BE(0x2112A442, 4);
    transactionId.copy(response, 8);
    
    response.writeUInt16BE(0x0009, 20);
    response.writeUInt16BE(4, 22);
    response.writeUInt16BE(errorCode, 24);
    response.writeUInt16BE(0, 26);

    this.socket.send(response, rinfo.port, rinfo.address);
  }

  ipToInt(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }
}

const getICEServers = (username, credential) => {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL || 'localhost';
  const cleanDomain = domain.replace(/^https?:\/\//, '');
  
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: `stun:${cleanDomain}:3478` },
    {
      urls: `turn:${cleanDomain}:3478`,
      username: username,
      credential: credential
    },
    {
      urls: `turn:${cleanDomain}:3478?transport=tcp`,
      username: username,
      credential: credential
    }
  ];
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

const AUDIO_ROOM_ID = 'audio-room';
const audioRoom = {
  users: new Map(),
  maxUsers: 100,
  created: new Date().toISOString()
};

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    users: audioRoom.users.size,
    maxUsers: audioRoom.maxUsers
  });
});

app.get('/api/ice-servers', (req, res) => {
  const turnCreds = generateTURNCredentials();
  const iceServers = getICEServers(turnCreds.username, turnCreds.credential);
  
  res.json({
    iceServers: iceServers,
    turnCredentials: turnCreds
  });
});

app.get('/', (req, res) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  res.json({
    name: 'Railway TURN Audio Server',
    status: 'running',
    audioRoom: {
      id: AUDIO_ROOM_ID,
      users: audioRoom.users.size,
      maxUsers: audioRoom.maxUsers,
      wsUrl: baseUrl
    },
    endpoints: {
      health: `${baseUrl}/health`,
      iceServers: `${baseUrl}/api/ice-servers`,
      websocket: baseUrl
    }
  });
});

io.on('connection', (socket) => {
  let userInfo = null;
  
  socket.on('join-audio-room', (data = {}) => {
    if (audioRoom.users.size >= audioRoom.maxUsers) {
      socket.emit('room-full');
      return;
    }
    
    userInfo = {
      id: socket.id,
      nickname: data.nickname || `User${Date.now()}`,
      muted: data.muted || false,
      joinedAt: Date.now()
    };
    
    audioRoom.users.set(socket.id, userInfo);
    socket.join(AUDIO_ROOM_ID);
    
    const turnCreds = generateTURNCredentials();
    
    socket.emit('audio-room-joined', {
      roomId: AUDIO_ROOM_ID,
      userInfo: userInfo,
      users: Array.from(audioRoom.users.values()),
      iceServers: getICEServers(turnCreds.username, turnCreds.credential)
    });
    
    socket.to(AUDIO_ROOM_ID).emit('user-joined', {
      user: userInfo,
      totalUsers: audioRoom.users.size
    });
  });
  
  socket.on('audio-offer', (data) => {
    socket.to(data.target).emit('audio-offer', {
      offer: data.offer,
      sender: socket.id
    });
  });
  
  socket.on('audio-answer', (data) => {
    socket.to(data.target).emit('audio-answer', {
      answer: data.answer,
      sender: socket.id
    });
  });
  
  socket.on('ice-candidate', (data) => {
    socket.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
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
  
  socket.on('disconnect', () => {
    if (userInfo && audioRoom.users.has(socket.id)) {
      audioRoom.users.delete(socket.id);
      
      socket.to(AUDIO_ROOM_ID).emit('user-left', {
        userId: socket.id,
        totalUsers: audioRoom.users.size
      });
    }
  });
});

const turnServer = new TURNServer(TURN_PORT);

server.listen(PORT, HOST, () => {
  log(`Audio server running on ${HOST}:${PORT}`);
  turnServer.start();
  
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
  if (domain) {
    const cleanDomain = domain.replace(/^https?:\/\//, '');
    log(`Public URL: https://${cleanDomain}`);
  }
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
EOL
}

create_railway_configs() {
    cat > railway.toml << 'EOL'
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
restartPolicyType = "always"

[variables]
NODE_ENV = "production"
EOL

    cat > nixpacks.toml << 'EOL'
[phases.setup]
nixPkgs = ["nodejs-20_x", "npm-10_x", "openssl", "coturn"]

[phases.build]
cmds = ["npm ci --production"]

[phases.start]
cmd = "npm start"
EOL

    cat > .railwayignore << 'EOL'
node_modules
.git
*.log
.env.local
EOL
}

create_dockerfile() {
    cat > Dockerfile << 'EOL'
FROM node:20-alpine

RUN apk add --no-cache openssl coturn

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN addgroup -g 1001 -S nodejs && \
    adduser -S audioserver -u 1001 -G nodejs

USER audioserver

EXPOSE 3000 3478

CMD ["npm", "start"]
EOL
}

create_environment_files() {
    cat > .env << EOF
NODE_ENV=production
PORT=3000
TURN_PORT=3478
TURN_SECRET=${TURN_SECRET}
TURN_USERNAME=${TURN_USERNAME}
TURN_PASSWORD=${TURN_PASSWORD}
EOF

    cat > .env.example << 'EOL'
NODE_ENV=production
PORT=3000
TURN_PORT=3478
TURN_SECRET=your-secret-here
TURN_USERNAME=audiouser
TURN_PASSWORD=your-password-here
EOL
}

setup_railway() {
    if ! railway whoami &> /dev/null; then
        railway login
    fi
    
    if [[ ! -d ".railway" ]]; then
        railway init
    fi
    
    if ! railway service &> /dev/null 2>&1; then
        log "No service linked - creating new service"
        railway service create --name "turn-audio-server" || {
            log "Creating service interactively"
            railway add
        }
    fi
    
    railway variables --set "NODE_ENV=production" --set "TURN_SECRET=$TURN_SECRET" --set "TURN_USERNAME=$TURN_USERNAME" --set "TURN_PASSWORD=$TURN_PASSWORD"
}

deploy_to_railway() {
    if [[ ! -d ".git" ]]; then
        git init
        git branch -M main
        
        cat > .gitignore << 'EOL'
node_modules/
.env
*.log
EOL
    fi
    
    git add .
    git commit -m "Deploy TURN audio server" || true
    
    if ! railway service &> /dev/null 2>&1; then
        log "Linking service before deployment"
        railway service create --name "turn-audio-server" || railway add
    fi
    
    railway up --detach
    
    sleep 30
    
    local domain=""
    local attempts=0
    local max_attempts=5
    
    while [[ $attempts -lt $max_attempts ]]; do
        domain=$(railway domain 2>/dev/null | grep -v "No custom domain" | head -1 2>/dev/null || echo "")
        
        if [[ -z "$domain" || "$domain" == "No custom domain set" ]]; then
            domain=$(railway status 2>/dev/null | grep -o 'https://[^/]*\.railway\.app' | sed 's|https://||' | head -1 2>/dev/null || echo "")
        fi
        
        if [[ -n "$domain" ]]; then
            break
        fi
        
        sleep 10
        ((attempts++))
    done
    
    if [[ -n "$domain" ]]; then
        success "TURN Audio Server deployed!"
        log "URL: https://$domain"
        log "Health: https://$domain/health"
        log "ICE Servers: https://$domain/api/ice-servers"
    else
        log "Deployment complete"
        log "Check Railway dashboard for service URL: https://railway.com/project/1bb98ab7-a0f3-47db-983a-1caa78801da9"
    fi
}

main() {
    log "Starting Railway TURN Audio Server deployment"
    
    if ! command -v railway &> /dev/null; then
        install_dependencies
    fi
    
    if [[ ! -f "package.json" ]]; then
        create_project
    fi
    
    npm install
    setup_railway
    deploy_to_railway
    
    success "Deployment complete!"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi