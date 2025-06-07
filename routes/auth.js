const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword, referralCode } = req.body;

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({ 
                error: 'جميع الحقول مطلوبة' 
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ 
                error: 'كلمات المرور غير متطابقة' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'كلمة المرور يجب أن تكون على الأقل 6 أحرف' 
            });
        }

        // Check if user exists
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ 
                error: 'اسم المستخدم موجود بالفعل' 
            });
        }

        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ 
                error: 'البريد الإلكتروني مستخدم بالفعل' 
            });
        }

        // Create user
        const newUser = await User.create({
            username,
            email,
            password,
            referredBy: referralCode || null
        });

        // Process referral bonus if applicable
        if (referralCode) {
            try {
                const referrer = await User.findByReferralCode(referralCode);
                if (referrer) {
                    await User.updateBalance(referrer.id, 10); // 10 TRX referral bonus
                    await Transaction.create({
                        user_id: referrer.id,
                        type: 'referral',
                        amount: 10,
                        status: 'completed',
                        description: `مكافأة إحالة لتسجيل ${username}`
                    });
                }
            } catch (refErr) {
                console.log('خطأ في معالجة مكافأة الإحالة:', refErr);
            }
        }

        res.json({ 
            success: true, 
            message: 'تم إنشاء الحساب بنجاح',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        res.status(500).json({ 
            error: 'حدث خطأ في إنشاء الحساب' 
        });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                error: 'اسم المستخدم وكلمة المرور مطلوبان' 
            });
        }

        // Find user
        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(401).json({ 
                error: 'اسم المستخدم أو كلمة المرور غير صحيحة' 
            });
        }

        // Verify password
        const isValidPassword = await User.verifyPassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'اسم المستخدم أو كلمة المرور غير صحيحة' 
            });
        }

        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.isAdmin = user.is_admin;

        res.json({ 
            success: true, 
            message: 'تم تسجيل الدخول بنجاح',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin
            }
        });

    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        res.status(500).json({ 
            error: 'حدث خطأ في تسجيل الدخول' 
        });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                error: 'حدث خطأ في تسجيل الخروج' 
            });
        }
        res.json({ 
            success: true, 
            message: 'تم تسجيل الخروج بنجاح' 
        });
    });
});

// Check authentication status
router.get('/status', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                isAdmin: req.session.isAdmin
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
