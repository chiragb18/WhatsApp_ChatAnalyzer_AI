const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { initializeWhatsApp } = require('./whatsapp');

// Routes
const whatsappRoutes = require('./routes/whatsappRoutes');
const messageRoutes = require('./routes/messageRoutes');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// 1. DYNAMIC CORS: Survives Railway Load Balancers & Proxies
const allowedOrigins = [
  'https://whatsapp-chatanalyzer-ai.onrender.com',
  'https://whatsappchatanalyzerai-production.up.railway.app', // Some browsers use the backend's own URL for some internal calls
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000'
];

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected Origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// 1b. Socket.io with SAME CORS (Critical for Real-time sync)
const io = new Server(server, {
  cors: corsOptions,
  transports: ['polling', 'websocket'],
  pingTimeout: 60000, // Handle container spin-downs or cold starts
  pingInterval: 25000
});

// 2. Body Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. Request Logger (ORIGIN TRACKER)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`[API] ${req.method} ${req.path} | Origin: ${origin || 'None'}`);
  next();
});

// Mount Routers
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/messages', messageRoutes);

// Health Check (RAILWAY KEEPALIVE)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Root (Production Verification)
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'WA-AI',
    status: 'Operational',
    timestamp: new Date().toISOString()
  });
});

// Start Engine
initializeWhatsApp(io);

// Socket: respond to frontend's check-auth on connect
io.on('connection', (socket) => {
  const { getStatus, getLastQr } = require('./whatsapp');
  const status = getStatus();
  const lastQr = getLastQr();

  console.log('[Socket] Client connected. isReady:', status.isReady);

  if (status.isReady) {
    socket.emit('ready');
  } else if (lastQr) {
    socket.emit('qr', lastQr);
  }
});

// --- GLOBAL ERROR HANDLER (RECOVERS CORS ON CRASH) ---
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);

  // Re-apply CORS headers manually for safety even on crash
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production')) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

// Production Build Serving Logic
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const frontendPath = path.join(__dirname, '../frontend/build');

  app.use(express.static(frontendPath));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.resolve(frontendPath, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Core running on port ${PORT} [Mode: ${process.env.NODE_ENV || 'production'}]`);
});
