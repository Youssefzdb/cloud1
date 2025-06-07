const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    }
});

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        balance REAL DEFAULT 0,
        total_earned REAL DEFAULT 0,
        referral_code TEXT UNIQUE,
        referred_by TEXT,
        is_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('خطأ في إنشاء جدول المستخدمين:', err);
    });

    // Contracts table
    db.run(`CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        daily_return REAL NOT NULL,
        duration_days INTEGER NOT NULL,
        min_deposit REAL DEFAULT 50,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('خطأ في إنشاء جدول العقود:', err);
    });

    // User contracts table
    db.run(`CREATE TABLE IF NOT EXISTS user_contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        contract_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        daily_profit REAL NOT NULL,
        total_profit REAL DEFAULT 0,
        start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (contract_id) REFERENCES contracts (id)
    )`, (err) => {
        if (err) console.error('خطأ في إنشاء جدول عقود المستخدمين:', err);
    });

    // Transactions table
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'profit', 'referral'
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
        tx_hash TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`, (err) => {
        if (err) console.error('خطأ في إنشاء جدول المعاملات:', err);
    });

    // Deposits table
    db.run(`CREATE TABLE IF NOT EXISTS deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        trx_address TEXT NOT NULL,
        tx_hash TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        confirmed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`, (err) => {
        if (err) console.error('خطأ في إنشاء جدول الإيداعات:', err);
    });

    // Insert default contracts
    db.get("SELECT COUNT(*) as count FROM contracts", (err, row) => {
        if (!err && row.count === 0) {
            const contracts = [
                {
                    name: 'عقد المبتدئ',
                    description: 'عقد مثالي للمبتدئين في التعدين السحابي',
                    price: 50,
                    daily_return: 0.02, // 2% daily
                    duration_days: 30
                },
                {
                    name: 'عقد المتقدم',
                    description: 'عقد للمستثمرين المتقدمين مع عوائد أعلى',
                    price: 200,
                    daily_return: 0.025, // 2.5% daily
                    duration_days: 45
                },
                {
                    name: 'عقد الخبراء',
                    description: 'عقد للخبراء مع أعلى العوائد المتاحة',
                    price: 500,
                    daily_return: 0.03, // 3% daily
                    duration_days: 60
                }
            ];

            contracts.forEach(contract => {
                db.run(`INSERT INTO contracts (name, description, price, daily_return, duration_days) 
                        VALUES (?, ?, ?, ?, ?)`, 
                    [contract.name, contract.description, contract.price, contract.daily_return, contract.duration_days]);
            });
            console.log('✅ تم إدراج العقود الافتراضية');
        }
    });

    // Create admin user if not exists
    db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
        if (!err && !row) {
            const bcrypt = require('bcrypt');
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
            
            bcrypt.hash(adminPassword, 10, (err, hashedPassword) => {
                if (!err) {
                    db.run(`INSERT INTO users (username, email, password, is_admin, referral_code) 
                            VALUES (?, ?, ?, ?, ?)`, 
                        ['admin', 'admin@cloudmining.com', hashedPassword, 1, 'ADMIN001']);
                    console.log('✅ تم إنشاء حساب المدير الافتراضي');
                }
            });
        }
    });
});

// Profit calculation function (runs every hour)
setInterval(() => {
    console.log('🔄 بدء حساب الأرباح التلقائية...');
    
    db.all(`SELECT uc.*, u.id as user_id, c.daily_return 
            FROM user_contracts uc 
            JOIN users u ON uc.user_id = u.id 
            JOIN contracts c ON uc.contract_id = c.id 
            WHERE uc.is_active = 1 AND datetime('now') <= uc.end_date`, 
        (err, contracts) => {
            if (err) {
                console.error('خطأ في جلب العقود النشطة:', err);
                return;
            }

            contracts.forEach(contract => {
                const dailyProfit = contract.amount * contract.daily_return;
                
                // Add profit to user balance
                db.run(`UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?`,
                    [dailyProfit, dailyProfit, contract.user_id]);

                // Update contract total profit
                db.run(`UPDATE user_contracts SET total_profit = total_profit + ? WHERE id = ?`,
                    [dailyProfit, contract.id]);

                // Record transaction
                db.run(`INSERT INTO transactions (user_id, type, amount, status, description) 
                        VALUES (?, 'profit', ?, 'completed', 'ربح يومي من العقد')`,
                    [contract.user_id, dailyProfit]);
            });
            
            console.log(`✅ تم حساب الأرباح لـ ${contracts.length} عقد نشط`);
        });
}, 60 * 60 * 1000); // Run every hour

module.exports = db;
