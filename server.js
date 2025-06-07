const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const crypto = require('crypto-js');
const bcrypt = require('bcrypt');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for deployment platforms
app.set('trust proxy', 1);

// Import routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

// Database initialization
const db = require('./config/database');

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-domain.com', 'https://your-domain.replit.app', 'https://your-domain.vercel.app']
        : ['http://localhost:5000', 'http://127.0.0.1:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'تم تجاوز حد الطلبات المسموحة، يرجى المحاولة لاحقاً',
        retryAfter: '15 دقيقة'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // stricter limit for API endpoints
    message: {
        error: 'تم تجاوز حد طلبات API، يرجى المحاولة لاحقاً'
    }
});

app.use(limiter);
app.use('/api', apiLimiter);
app.use('/auth', apiLimiter);

// Compression middleware
app.use(compression());

// Basic middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'cloud-mining-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Serve static pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/deposit', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'deposit.html'));
});

app.get('/admin-panel', (req, res) => {
    if (!req.session.userId || !req.session.isAdmin) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Data encryption utilities
const encryptSensitiveData = (data) => {
    const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    return crypto.AES.encrypt(JSON.stringify(data), secretKey).toString();
};

const decryptSensitiveData = (encryptedData) => {
    const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    const decrypted = crypto.AES.decrypt(encryptedData, secretKey);
    return JSON.parse(decrypted.toString(crypto.enc.Utf8));
};

// Daily backup function
const performDailyBackup = () => {
    const fs = require('fs');
    const backupDir = './backups';
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${backupDir}/backup_${timestamp}.sqlite`;
    
    try {
        fs.copyFileSync('./database.sqlite', backupPath);
        console.log(`✅ تم إنشاء نسخة احتياطية: ${backupPath}`);
        
        // Keep only last 7 backups
        const backupFiles = fs.readdirSync(backupDir)
            .filter(file => file.startsWith('backup_'))
            .sort()
            .reverse();
            
        if (backupFiles.length > 7) {
            const oldBackups = backupFiles.slice(7);
            oldBackups.forEach(file => {
                fs.unlinkSync(`${backupDir}/${file}`);
                console.log(`🗑️ تم حذف النسخة الاحتياطية القديمة: ${file}`);
            });
        }
    } catch (error) {
        console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error);
    }
};

// Security monitoring
const securityLog = (event, details = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        event,
        details,
        userAgent: details.userAgent || 'unknown',
        ip: details.ip || 'unknown'
    };
    
    console.log(`🔒 حدث أمني: ${event}`, logEntry);
    
    // In production, you might want to send this to an external logging service
    // like Sentry or LogRocket
};

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(healthCheck);
});

// Security endpoint for monitoring
app.get('/security-status', (req, res) => {
    res.status(200).json({
        helmet: 'enabled',
        cors: 'configured',
        rateLimit: 'active',
        compression: 'enabled',
        encryption: 'available',
        backup: 'scheduled'
    });
});

// Error handler with security logging
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    securityLog('server_error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({ 
        error: 'حدث خطأ في الخادم',
        timestamp: new Date().toISOString()
    });
});

// Schedule daily backup (runs every 24 hours)
setInterval(performDailyBackup, 24 * 60 * 60 * 1000);

// Perform initial backup on startup
setTimeout(performDailyBackup, 5000);

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('📴 إيقاف الخادم بأمان...');
    performDailyBackup();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 إيقاف الخادم بأمان...');
    performDailyBackup();
    process.exit(0);
});

// Initialize server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 منصة التعدين السحابي تعمل على المنفذ ${PORT}`);
    console.log(`🔗 الرابط: http://localhost:${PORT}`);
    console.log(`🔒 الأمان: Helmet, CORS, Rate Limiting مفعلة`);
    console.log(`💾 النسخ الاحتياطي: مجدولة كل 24 ساعة`);
    console.log(`📊 مراقبة الصحة: /health`);
    console.log(`🛡️ حالة الأمان: /security-status`);
});

// Export for testing
module.exports = { app, server, encryptSensitiveData, decryptSensitiveData };
