const db = require('../config/database');

class Contract {
    // Get all active contracts
    static async getAll() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM contracts WHERE is_active = 1 ORDER BY price ASC', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get contract by ID
    static async findById(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM contracts WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Purchase contract
    static async purchase(userId, contractId, amount) {
        return new Promise((resolve, reject) => {
            // Start transaction
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Get contract details
                db.get('SELECT * FROM contracts WHERE id = ?', [contractId], (err, contract) => {
                    if (err || !contract) {
                        db.run('ROLLBACK');
                        reject(new Error('العقد غير موجود'));
                        return;
                    }

                    // Check user balance
                    db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, user) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        if (!user || user.balance < amount) {
                            db.run('ROLLBACK');
                            reject(new Error('الرصيد غير كافي'));
                            return;
                        }

                        if (amount < contract.min_deposit) {
                            db.run('ROLLBACK');
                            reject(new Error(`الحد الأدنى للاستثمار هو ${contract.min_deposit} TRX`));
                            return;
                        }

                        const dailyProfit = amount * contract.daily_return;
                        const endDate = new Date();
                        endDate.setDate(endDate.getDate() + contract.duration_days);

                        // Deduct amount from user balance
                        db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId], (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                            }

                            // Create user contract
                            db.run(`INSERT INTO user_contracts (user_id, contract_id, amount, daily_profit, end_date) 
                                    VALUES (?, ?, ?, ?, ?)`,
                                [userId, contractId, amount, dailyProfit, endDate.toISOString()],
                                function(err) {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        reject(err);
                                        return;
                                    }

                                    // Record transaction
                                    db.run(`INSERT INTO transactions (user_id, type, amount, status, description) 
                                            VALUES (?, 'purchase', ?, 'completed', ?)`,
                                        [userId, amount, `شراء عقد: ${contract.name}`],
                                        (err) => {
                                            if (err) {
                                                db.run('ROLLBACK');
                                                reject(err);
                                            } else {
                                                db.run('COMMIT');
                                                resolve({
                                                    id: this.lastID,
                                                    contractName: contract.name,
                                                    amount,
                                                    dailyProfit,
                                                    endDate: endDate.toISOString()
                                                });
                                            }
                                        });
                                });
                        });
                    });
                });
            });
        });
    }

    // Get user contracts
    static async getUserContracts(userId) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT uc.*, c.name as contract_name, c.description 
                    FROM user_contracts uc 
                    JOIN contracts c ON uc.contract_id = c.id 
                    WHERE uc.user_id = ? 
                    ORDER BY uc.start_date DESC`,
                [userId], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
        });
    }

    // Create new contract (admin only)
    static async create(contractData) {
        return new Promise((resolve, reject) => {
            const { name, description, price, daily_return, duration_days, min_deposit } = contractData;
            
            db.run(`INSERT INTO contracts (name, description, price, daily_return, duration_days, min_deposit) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [name, description, price, daily_return, duration_days, min_deposit || 50],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...contractData });
                    }
                });
        });
    }

    // Update contract (admin only)
    static async update(id, contractData) {
        return new Promise((resolve, reject) => {
            const { name, description, price, daily_return, duration_days, min_deposit, is_active } = contractData;
            
            db.run(`UPDATE contracts SET name = ?, description = ?, price = ?, daily_return = ?, 
                    duration_days = ?, min_deposit = ?, is_active = ? WHERE id = ?`,
                [name, description, price, daily_return, duration_days, min_deposit, is_active, id],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                });
        });
    }

    // Get contract statistics
    static async getStats() {
        return new Promise((resolve, reject) => {
            const queries = [
                // Total contracts
                new Promise((res, rej) => {
                    db.get('SELECT COUNT(*) as count FROM contracts', (err, row) => {
                        if (err) rej(err);
                        else res(row.count);
                    });
                }),
                // Active user contracts
                new Promise((res, rej) => {
                    db.get('SELECT COUNT(*) as count FROM user_contracts WHERE is_active = 1', (err, row) => {
                        if (err) rej(err);
                        else res(row.count);
                    });
                }),
                // Total invested
                new Promise((res, rej) => {
                    db.get('SELECT COALESCE(SUM(amount), 0) as total FROM user_contracts', (err, row) => {
                        if (err) rej(err);
                        else res(row.total);
                    });
                })
            ];

            Promise.all(queries)
                .then(([totalContracts, activeUserContracts, totalInvested]) => {
                    resolve({
                        totalContracts,
                        activeUserContracts,
                        totalInvested
                    });
                })
                .catch(reject);
        });
    }
}

module.exports = Contract;
