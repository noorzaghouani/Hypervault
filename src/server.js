'use strict';
require('dotenv').config();

const express      = require('express');
const https        = require('https');
const path         = require('path');
const fs           = require('fs');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const cors         = require('cors');
const pool         = require('./config/db');
const { requireAuth }      = require('./middlewares/authMiddleware');
const csrfProtection       = require('./middlewares/csrfMiddleware');
const dashboardController  = require('./controllers/dashboardController');
const SessionModel         = require('./models/sessionModel');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS for React dev server & local HTTPS ───────────────────────────────────
app.use(cors({
    origin: [
        'https://hypervault.com:3000',
        'https://hypervault.com',
        'https://localhost:3000',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'CSRF-Token', 'x-csrf-token']
}));

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(csrfProtection);

// ── CSRF Token endpoint (React fetches this on boot) ─────────────────────────
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: res.locals.csrfToken });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/admin',     require('./routes/adminRoutes'));
app.use('/api/audit',     require('./routes/auditRoutes'));

// ── Dashboard endpoint ────────────────────────────────────────────────────────
app.get('/api/dashboard', requireAuth, dashboardController.getDashboard);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT COUNT(*) AS total FROM users');
        const [roles] = await pool.query('SELECT role, COUNT(*) AS count FROM users GROUP BY role');
        res.json({ status: 'ONLINE', application: 'HyperVault Security Portal', database: 'CONNECTED', total_users: users[0].total, roles });
    } catch {
        res.status(500).json({ status: 'ERROR', database: 'DISCONNECTED' });
    }
});

// ── Serve React build (production) ────────────────────────────────────────────
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
const indexPath    = path.join(frontendDist, 'index.html');
app.use(express.static(frontendDist));

app.get('/{*splat}', (req, res) => {
    res.sendFile(indexPath, (err) => {
        if (err && !res.headersSent) {
            res.json({ status: 'HyperVault API running', hint: 'Build React app with: cd frontend && npm run build' });
        }
    });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ── Start (HTTPS / HTTP) ──────────────────────────────────────────────────────
const certPath = path.join(__dirname, '..', 'certs', 'cert.pem');
const keyPath  = path.join(__dirname, '..', 'certs', 'key.pem');

let server;
let isHttps = false;

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const sslOptions = {
        key : fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    server = https.createServer(sslOptions, app);
    isHttps = true;
} else {
    server = app;
}

const proto = isHttps ? 'https' : 'http';

server.listen(PORT, async () => {
    console.log(`\n🛡️  HYPERVAULT [${proto.toUpperCase()}] → ${proto}://hypervault.com:${PORT}`);
    console.log(`🛡️  Alternative Access  → ${proto}://localhost:${PORT}\n`);
    try {
        await pool.query('SELECT 1');
        console.log('✅ MySQL connected.\n');
        const purged = await SessionModel.cleanupExpired();
        if (purged > 0) console.log(`🧹 Purged ${purged} expired session(s).\n`);
    } catch (err) {
        console.error('❌ MySQL failed:', err.message);
    }
});