/**
 * Authentication middleware
 * Checks if user is logged in before allowing access to protected routes
 */
const authMiddleware = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ 
            error: 'يجب تسجيل الدخول للوصول لهذه الصفحة',
            redirect: '/'
        });
    }
    next();
};

/**
 * Admin authentication middleware
 * Checks if user is logged in and has admin privileges
 */
const adminAuthMiddleware = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ 
            error: 'يجب تسجيل الدخول للوصول لهذه الصفحة',
            redirect: '/'
        });
    }
    
    if (!req.session.isAdmin) {
        return res.status(403).json({ 
            error: 'الوصول مرفوض - صلاحيات المدير مطلوبة'
        });
    }
    
    next();
};

module.exports = {
    auth: authMiddleware,
    adminAuth: adminAuthMiddleware
};

// Export default as auth for backward compatibility
module.exports = authMiddleware;
