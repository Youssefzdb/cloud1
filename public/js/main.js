/**
 * Main JavaScript file for Cloud Mining Platform
 * Handles homepage functionality, authentication, and contract display
 */

// Global variables
let currentUser = null;
let contracts = [];

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تهيئة منصة التعدين السحابي...');
    
    initializeApp();
    setupEventListeners();
    checkAuthenticationStatus();
    loadContracts();
    handleReferralCode();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    console.log('✅ تم تهيئة التطبيق بنجاح');
}

/**
 * Setup event listeners for forms and interactions
 */
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Handle modal events
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');

    if (loginModal) {
        loginModal.addEventListener('shown.bs.modal', function () {
            document.getElementById('loginUsername').focus();
        });
    }

    if (registerModal) {
        registerModal.addEventListener('shown.bs.modal', function () {
            document.getElementById('registerUsername').focus();
        });
    }

    console.log('✅ تم تسجيل مستمعي الأحداث');
}

/**
 * Check if user is already authenticated
 */
async function checkAuthenticationStatus() {
    try {
        const response = await fetch('/auth/status');
        const data = await response.json();

        if (data.authenticated) {
            currentUser = data.user;
            updateUIForLoggedInUser();
        } else {
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('خطأ في التحقق من حالة المصادقة:', error);
        updateUIForLoggedOutUser();
    }
}

/**
 * Update UI for logged-in user
 */
function updateUIForLoggedInUser() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const usernameDisplay = document.getElementById('usernameDisplay');

    if (authButtons && userMenu && usernameDisplay) {
        authButtons.classList.add('d-none');
        userMenu.classList.remove('d-none');
        usernameDisplay.textContent = currentUser.username;
    }

    // Show admin link if user is admin
    const adminPanelLink = document.getElementById('adminPanelLink');
    if (adminPanelLink && currentUser.isAdmin) {
        adminPanelLink.style.display = 'block';
        adminPanelLink.href = '/admin-panel';
    }

    console.log(`👤 مرحباً ${currentUser.username}`);
}

/**
 * Update UI for logged-out user
 */
function updateUIForLoggedOutUser() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    if (authButtons && userMenu) {
        authButtons.classList.remove('d-none');
        userMenu.classList.add('d-none');
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جار تسجيل الدخول...';

        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            showToast('تم تسجيل الدخول بنجاح', 'success');
            
            // Close modal and redirect
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal.hide();
            
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            showToast(data.error || 'خطأ في تسجيل الدخول', 'error');
        }
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        showToast('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Handle register form submission
 */
async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const referralCode = document.getElementById('referralCode').value.trim();

    // Client-side validation
    if (!username || !email || !password || !confirmPassword) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showToast('كلمات المرور غير متطابقة', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('كلمة المرور يجب أن تكون على الأقل 6 أحرف', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showToast('يرجى إدخال بريد إلكتروني صحيح', 'error');
        return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جار إنشاء الحساب...';

        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                password,
                confirmPassword,
                referralCode
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('تم إنشاء الحساب بنجاح', 'success');
            
            // Close register modal and open login modal
            const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
            registerModal.hide();
            
            setTimeout(() => {
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
                document.getElementById('loginUsername').value = username;
            }, 500);
        } else {
            showToast(data.error || 'خطأ في إنشاء الحساب', 'error');
        }
    } catch (error) {
        console.error('خطأ في إنشاء الحساب:', error);
        showToast('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Handle logout
 */
async function logout() {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            currentUser = null;
            showToast('تم تسجيل الخروج بنجاح', 'success');
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
        showToast('حدث خطأ في تسجيل الخروج', 'error');
    }
}

/**
 * Load available contracts
 */
async function loadContracts() {
    const container = document.getElementById('contractsContainer');
    if (!container) return;

    try {
        const response = await fetch('/api/contracts');
        contracts = await response.json();

        if (contracts.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        لا توجد عقود متاحة حالياً
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = contracts.map(contract => `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card contract-card h-100">
                    <div class="card-header text-center">
                        <h5 class="mb-0">${contract.name}</h5>
                    </div>
                    <div class="card-body">
                        <p class="text-muted">${contract.description}</p>
                        
                        <ul class="contract-features">
                            <li>
                                <i class="fas fa-coins"></i>
                                <span>الحد الأدنى: ${contract.min_deposit} TRX</span>
                            </li>
                            <li>
                                <i class="fas fa-chart-line"></i>
                                <span>العائد اليومي: ${(contract.daily_return * 100).toFixed(2)}%</span>
                            </li>
                            <li>
                                <i class="fas fa-calendar-alt"></i>
                                <span>المدة: ${contract.duration_days} يوم</span>
                            </li>
                            <li>
                                <i class="fas fa-calculator"></i>
                                <span>إجمالي العائد: ${(contract.daily_return * contract.duration_days * 100).toFixed(0)}%</span>
                            </li>
                        </ul>
                    </div>
                    <div class="card-footer text-center">
                        ${currentUser ? 
                            `<a href="/dashboard" class="btn btn-primary btn-lg w-100">
                                <i class="fas fa-shopping-cart me-2"></i>
                                شراء العقد
                            </a>` :
                            `<button class="btn btn-primary btn-lg w-100" data-bs-toggle="modal" data-bs-target="#loginModal">
                                <i class="fas fa-sign-in-alt me-2"></i>
                                سجل دخولك للشراء
                            </button>`
                        }
                    </div>
                </div>
            </div>
        `).join('');

        console.log(`✅ تم تحميل ${contracts.length} عقد`);
    } catch (error) {
        console.error('خطأ في تحميل العقود:', error);
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    حدث خطأ في تحميل العقود
                </div>
            </div>
        `;
    }
}

/**
 * Handle referral code from URL
 */
function handleReferralCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
        const referralInput = document.getElementById('referralCode');
        if (referralInput) {
            referralInput.value = refCode;
            
            // Show register modal if user is not logged in
            if (!currentUser) {
                setTimeout(() => {
                    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
                    registerModal.show();
                    showToast('تم تطبيق كود الإحالة تلقائياً', 'success');
                }, 1000);
            }
        }
        
        console.log(`🔗 تم تطبيق كود الإحالة: ${refCode}`);
    }
}

/**
 * Scroll to specific section
 */
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toastElement = document.getElementById('alertToast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toastElement || !toastMessage) return;

    // Set message
    toastMessage.textContent = message;
    
    // Set icon based on type
    const toastHeader = toastElement.querySelector('.toast-header i');
    const iconClasses = {
        success: 'fas fa-check-circle text-success',
        error: 'fas fa-exclamation-circle text-danger',
        warning: 'fas fa-exclamation-triangle text-warning',
        info: 'fas fa-info-circle text-primary'
    };
    
    if (toastHeader) {
        toastHeader.className = iconClasses[type] || iconClasses.info;
    }

    // Show toast
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: type === 'error' ? 5000 : 3000
    });
    toast.show();
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Format number with Arabic locale
 */
function formatNumber(number, decimals = 2) {
    return new Intl.NumberFormat('ar-SA', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

/**
 * Format date with Arabic locale
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

/**
 * Debounce function for performance optimization
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Handle errors gracefully
 */
function handleError(error, context = '') {
    console.error(`خطأ في ${context}:`, error);
    
    let message = 'حدث خطأ غير متوقع';
    
    if (error.message) {
        message = error.message;
    } else if (typeof error === 'string') {
        message = error;
    }
    
    showToast(message, 'error');
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text, successMessage = 'تم النسخ بنجاح') {
    try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage, 'success');
        return true;
    } catch (error) {
        console.error('خطأ في النسخ:', error);
        
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showToast(successMessage, 'success');
            return true;
        } catch (fallbackError) {
            showToast('فشل في النسخ، يرجى النسخ يدوياً', 'error');
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

// Export functions for testing (if in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isValidEmail,
        formatNumber,
        formatDate,
        debounce,
        copyToClipboard
    };
}

console.log('✅ تم تحميل ملف JavaScript الرئيسي');
