const db = require('../config/database');

class Transaction {
    // Create new transaction
    static async create(transactionData) {
        return new Promise((resolve, reject) => {
            const { user_id, type, amount, status, tx_hash, description } = transactionData;
            
            db.run(`INSERT INTO transactions (user_id, type, amount, status, tx_hash, description) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [user_id, type, amount, status || 'pending', tx_hash, description],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...transactionData });
                    }
                });
        });
    }

    // Get user transactions
    static async getUserTransactions(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM transactions 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT ?`,
                [userId, limit], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
        });
    }

    // Get all transactions (admin only)
    static async getAll(limit = 100) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT t.*, u.username 
                    FROM transactions t 
                    JOIN users u ON t.user_id = u.id 
                    ORDER BY t.created_at DESC 
                    LIMIT ?`,
                [limit], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
        });
    }

    // Update transaction status
    static async updateStatus(id, status, tx_hash = null) {
        return new Promise((resolve, reject) => {
            db.run(`UPDATE transactions SET status = ?, tx_hash = ? WHERE id = ?`,
                [status, tx_hash, id],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                });
        });
    }

    // Create deposit transaction
    static async createDeposit(userId, amount, trxAddress, txHash = null) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Create deposit record
                db.run(`INSERT INTO deposits (user_id, amount, trx_address, tx_hash) 
                        VALUES (?, ?, ?, ?)`,
                    [userId, amount, trxAddress, txHash],
                    function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        const depositId = this.lastID;

                        // Create transaction record
                        db.run(`INSERT INTO transactions (user_id, type, amount, description) 
                                VALUES (?, 'deposit', ?, 'إيداع TRX')`,
                            [userId, amount],
                            function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(err);
                                } else {
                                    db.run('COMMIT');
                                    resolve({ depositId, transactionId: this.lastID });
                                }
                            });
                    });
            });
        });
    }

    // Confirm deposit and update balance
    static async confirmDeposit(depositId, txHash) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Get deposit details
                db.get('SELECT * FROM deposits WHERE id = ? AND status = "pending"', [depositId], (err, deposit) => {
                    if (err || !deposit) {
                        db.run('ROLLBACK');
                        reject(new Error('الإيداع غير موجود أو تم تأكيده مسبقاً'));
                        return;
                    }

                    // Update deposit status
                    db.run(`UPDATE deposits SET status = 'completed', tx_hash = ?, confirmed_at = CURRENT_TIMESTAMP 
                            WHERE id = ?`, [txHash, depositId], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        // Update user balance
                        db.run('UPDATE users SET balance = balance + ? WHERE id = ?', 
                            [deposit.amount, deposit.user_id], (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                            }

                            // Update transaction status
                            db.run(`UPDATE transactions SET status = 'completed', tx_hash = ? 
                                    WHERE user_id = ? AND type = 'deposit' AND amount = ? AND status = 'pending'`,
                                [txHash, deposit.user_id, deposit.amount], (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(err);
                                } else {
                                    db.run('COMMIT');
                                    resolve({ success: true, amount: deposit.amount });
                                }
                            });
                        });
                    });
                });
            });
        });
    }

    // Get transaction statistics
    static async getStats() {
        return new Promise((resolve, reject) => {
            const queries = [
                // Total transactions
                new Promise((res, rej) => {
                    db.get('SELECT COUNT(*) as count FROM transactions', (err, row) => {
                        if (err) rej(err);
                        else res(row.count);
                    });
                }),
                // Total deposits
                new Promise((res, rej) => {
                    db.get('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = "deposit" AND status = "completed"', (err, row) => {
                        if (err) rej(err);
                        else res(row.total);
                    });
                }),
                // Total profits paid
                new Promise((res, rej) => {
                    db.get('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = "profit"', (err, row) => {
                        if (err) rej(err);
                        else res(row.total);
                    });
                }),
                // Pending deposits
                new Promise((res, rej) => {
                    db.get('SELECT COUNT(*) as count FROM deposits WHERE status = "pending"', (err, row) => {
                        if (err) rej(err);
                        else res(row.count);
                    });
                })
            ];

            Promise.all(queries)
                .then(([totalTransactions, totalDeposits, totalProfits, pendingDeposits]) => {
                    resolve({
                        totalTransactions,
                        totalDeposits,
                        totalProfits,
                        pendingDeposits
                    });
                })
                .catch(reject);
        });
    }
}

module.exports = Transaction;
