const express = require('express');
const User = require('../models/User');
const Contract = require('../models/Contract');
const Transaction = require('../models/Transaction');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Apply authentication middleware to all API routes
router.use(authMiddleware);

// Get user profile and stats
router.get('/profile', async (req, res) => {
    try {
        const userStats = await User.getStats(req.session.userId);
        res.json(userStats);
    } catch (error) {
        console.error('خطأ في جلب بيانات المستخدم:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب البيانات' });
    }
});

// Get all contracts
router.get('/contracts', async (req, res) => {
    try {
        const contracts = await Contract.getAll();
        res.json(contracts);
    } catch (error) {
        console.error('خطأ في جلب العقود:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب العقود' });
    }
});

// Get user contracts
router.get('/user-contracts', async (req, res) => {
    try {
        const userContracts = await Contract.getUserContracts(req.session.userId);
        res.json(userContracts);
    } catch (error) {
        console.error('خطأ في جلب عقود المستخدم:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب عقودك' });
    }
});

// Purchase contract
router.post('/purchase', async (req, res) => {
    try {
        const { contractId, amount } = req.body;

        if (!contractId || !amount || amount <= 0) {
            return res.status(400).json({ 
                error: 'معرف العقد والمبلغ مطلوبان' 
            });
        }

        const result = await Contract.purchase(req.session.userId, contractId, amount);
        res.json({ 
            success: true, 
            message: 'تم شراء العقد بنجاح',
            contract: result
        });

    } catch (error) {
        console.error('خطأ في شراء العقد:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get user transactions
router.get('/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.getUserTransactions(req.session.userId);
        res.json(transactions);
    } catch (error) {
        console.error('خطأ في جلب المعاملات:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب المعاملات' });
    }
});

// Create deposit
router.post('/deposit', async (req, res) => {
    try {
        const { amount, txHash } = req.body;

        if (!amount || amount < 50) {
            return res.status(400).json({ 
                error: 'الحد الأدنى للإيداع هو 50 TRX' 
            });
        }

        const trxAddress = process.env.TRX_WALLET_ADDRESS || 'TR2AQWkYfU29n2dh8LMPQL5WvZVSrPkzHa';
        
        const result = await Transaction.createDeposit(
            req.session.userId, 
            amount, 
            trxAddress, 
            txHash
        );

        res.json({ 
            success: true, 
            message: 'تم إنشاء طلب الإيداع بنجاح. سيتم تأكيده خلال 1-3 دقائق',
            deposit: result
        });

    } catch (error) {
        console.error('خطأ في إنشاء الإيداع:', error);
        res.status(500).json({ error: 'حدث خطأ في إنشاء الإيداع' });
    }
});

// Get deposit address and QR code
router.get('/deposit-info', (req, res) => {
    const trxAddress = process.env.TRX_WALLET_ADDRESS || 'TR2AQWkYfU29n2dh8LMPQL5WvZVSrPkzHa';
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${trxAddress}`;
    
    res.json({
        address: trxAddress,
        qrCode: qrCodeUrl,
        minDeposit: 50,
        confirmationTime: '1-3 دقائق'
    });
});

// Update user profile
router.put('/profile', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                error: 'البريد الإلكتروني مطلوب' 
            });
        }

        // Check if email is already taken by another user
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== req.session.userId) {
            return res.status(400).json({ 
                error: 'البريد الإلكتروني مستخدم بالفعل' 
            });
        }

        // Update user email (simplified - in production, add more fields)
        await User.updateEmail(req.session.userId, email);

        res.json({ 
            success: true, 
            message: 'تم تحديث الملف الشخصي بنجاح' 
        });

    } catch (error) {
        console.error('خطأ في تحديث الملف الشخصي:', error);
        res.status(500).json({ error: 'حدث خطأ في التحديث' });
    }
});

// Get referral information
router.get('/referral', async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        const referralUrl = `${req.protocol}://${req.get('host')}/?ref=${user.referral_code}`;
        
        res.json({
            referralCode: user.referral_code,
            referralUrl: referralUrl,
            bonus: 10 // TRX bonus per referral
        });

    } catch (error) {
        console.error('خطأ في جلب معلومات الإحالة:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب معلومات الإحالة' });
    }
});

module.exports = router;
