const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    // Create new user
    static async create(userData) {
        return new Promise((resolve, reject) => {
            const { username, email, password, referredBy } = userData;
            
            // Generate unique referral code
            const referralCode = this.generateReferralCode();
            
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    reject(err);
                    return;
                }

                db.run(`INSERT INTO users (username, email, password, referral_code, referred_by) 
                        VALUES (?, ?, ?, ?, ?)`,
                    [username, email, hashedPassword, referralCode, referredBy],
                    function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ id: this.lastID, username, email, referralCode });
                        }
                    });
            });
        });
    }

    // Find user by ID
    static async findById(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Find user by username
    static async findByUsername(username) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Find user by email
    static async findByEmail(email) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Verify password
    static async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    // Update user balance
    static async updateBalance(userId, amount) {
        return new Promise((resolve, reject) => {
            db.run('UPDATE users SET balance = balance + ? WHERE id = ?',
                [amount, userId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                });
        });
    }

    // Get user statistics
    static async getStats(userId) {
        return new Promise((resolve, reject) => {
            const queries = [
                // Get user basic info
                new Promise((res, rej) => {
                    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                        if (err) rej(err);
                        else res(row);
                    });
                }),
                // Get active contracts count
                new Promise((res, rej) => {
                    db.get('SELECT COUNT(*) as count FROM user_contracts WHERE user_id = ? AND is_active = 1',
                        [userId], (err, row) => {
                            if (err) rej(err);
                            else res(row.count);
                        });
                }),
                // Get total invested
                new Promise((res, rej) => {
                    db.get('SELECT COALESCE(SUM(amount), 0) as total FROM user_contracts WHERE user_id = ?',
                        [userId], (err, row) => {
                            if (err) rej(err);
                            else res(row.total);
                        });
                }),
                // Get referrals count
                new Promise((res, rej) => {
                    db.get('SELECT COUNT(*) as count FROM users WHERE referred_by = (SELECT referral_code FROM users WHERE id = ?)',
                        [userId], (err, row) => {
                            if (err) rej(err);
                            else res(row.count);
                        });
                })
            ];

            Promise.all(queries)
                .then(([user, activeContracts, totalInvested, referralsCount]) => {
                    resolve({
                        ...user,
                        activeContracts,
                        totalInvested,
                        referralsCount
                    });
                })
                .catch(reject);
        });
    }

    // Generate referral code
    static generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Get all users (admin only)
    static async getAll() {
        return new Promise((resolve, reject) => {
            db.all('SELECT id, username, email, balance, total_earned, created_at FROM users ORDER BY created_at DESC',
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
        });
    }
}

module.exports = User;
