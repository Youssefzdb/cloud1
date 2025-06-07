const express = require('express');
const User = require('../models/User');
const Contract = require('../models/Contract');
const Transaction = require('../models/Transaction');
const router = express.Router();

// Admin authentication middleware
const adminAuth = (req, res, next) => {
    if (!req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ error: 'الوصول مرفوض - صلاحيات المدير مطلوبة' });
    }
    next();
};

router.use(adminAuth);

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const [userStats, contractStats, transactionStats] = await Promise.all([
            User.getStats(),
            Contract.getStats(),
            Transaction.getStats()
        ]);

        res.json({
            users: userStats,
            contracts: contractStats,
            transactions: transactionStats
        });

    } catch (error) {
        console.error('خطأ في جلب إحصائيات المدير:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب الإحصائيات' });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.getAll();
        res.json(users);
    } catch (error) {
        console.error('خطأ في جلب المستخدمين:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب المستخدمين' });
    }
});

// Get all transactions
router.get('/transactions', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const transactions = await Transaction.getAll(limit);
        res.json(transactions);
    } catch (error) {
        console.error('خطأ في جلب المعاملات:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب المعاملات' });
    }
});

// Update user balance (manual adjustment)
router.put('/users/:id/balance', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, description } = req.body;

        if (!amount || !description) {
            return res.status(400).json({ 
                error: 'المبلغ والوصف مطلوبان' 
            });
        }

        await User.updateBalance(id, amount);
        
        // Record transaction
        await Transaction.create({
            user_id: id,
            type: amount > 0 ? 'admin_credit' : 'admin_debit',
            amount: Math.abs(amount),
            status: 'completed',
            description: `تعديل يدوي من المدير: ${description}`
        });

        res.json({ 
            success: true, 
            message: 'تم تحديث الرصيد بنجاح' 
        });

    } catch (error) {
        console.error('خطأ في تحديث الرصيد:', error);
        res.status(500).json({ error: 'حدث خطأ في تحديث الرصيد' });
    }
});

// Create new contract
router.post('/contracts', async (req, res) => {
    try {
        const contractData = req.body;
        
        // Validation
        if (!contractData.name || !contractData.price || !contractData.daily_return || !contractData.duration_days) {
            return res.status(400).json({ 
                error: 'جميع حقول العقد مطلوبة' 
            });
        }

        const newContract = await Contract.create(contractData);
        res.json({ 
            success: true, 
            message: 'تم إنشاء العقد بنجاح',
            contract: newContract
        });

    } catch (error) {
        console.error('خطأ في إنشاء العقد:', error);
        res.status(500).json({ error: 'حدث خطأ في إنشاء العقد' });
    }
});

// Update contract
router.put('/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const contractData = req.body;

        const updated = await Contract.update(id, contractData);
        
        if (updated === 0) {
            return res.status(404).json({ error: 'العقد غير موجود' });
        }

        res.json({ 
            success: true, 
            message: 'تم تحديث العقد بنجاح' 
        });

    } catch (error) {
        console.error('خطأ في تحديث العقد:', error);
        res.status(500).json({ error: 'حدث خطأ في تحديث العقد' });
    }
});

// Confirm deposit manually
router.put('/deposits/:id/confirm', async (req, res) => {
    try {
        const { id } = req.params;
        const { txHash } = req.body;

        if (!txHash) {
            return res.status(400).json({ 
                error: 'رقم المعاملة مطلوب' 
            });
        }

        const result = await Transaction.confirmDeposit(id, txHash);
        
        res.json({ 
            success: true, 
            message: `تم تأكيد الإيداع بمبلغ ${result.amount} TRX`,
            amount: result.amount
        });

    } catch (error) {
        console.error('خطأ في تأكيد الإيداع:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get pending deposits
router.get('/deposits/pending', async (req, res) => {
    try {
        const db = require('../config/database');
        
        db.all(`SELECT d.*, u.username 
                FROM deposits d 
                JOIN users u ON d.user_id = u.id 
                WHERE d.status = 'pending' 
                ORDER BY d.created_at DESC`, 
            (err, rows) => {
                if (err) {
                    console.error('خطأ في جلب الإيداعات المعلقة:', err);
                    return res.status(500).json({ error: 'حدث خطأ في جلب البيانات' });
                }
                res.json(rows);
            });

    } catch (error) {
        console.error('خطأ في جلب الإيداعات المعلقة:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب الإيداعات المعلقة' });
    }
});

// System settings
router.get('/settings', (req, res) => {
    res.json({
        trxAddress: process.env.TRX_WALLET_ADDRESS || 'TR2AQWkYfU29n2dh8LMPQL5WvZVSrPkzHa',
        minDeposit: 50,
        referralBonus: 10,
        profitCalculationInterval: 'hourly'
    });
});

router.put('/settings', (req, res) => {
    // In a real application, you would save these to a settings table
    res.json({ 
        success: true, 
        message: 'تم تحديث الإعدادات بنجاح' 
    });
});

module.exports = router;
