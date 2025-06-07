/**
 * Deposit JavaScript for Cloud Mining Platform
 * Handles TRX deposit functionality with QR code and address management
 */

// Global variables
let depositInfo = null;
let currentUser = null;

// Initialize deposit page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 تهيئة صفحة الإيداع...');
    
    initializeDepositPage();
    setupEventListeners();
    checkAuthStatus();
    loadDepositInfo();
});

/**
 * Initialize deposit page
 */
function initializeDepositPage() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize security features
    implementAddressSecurity();

    console.log('✅ تم تهيئة صفحة الإيداع');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Manual deposit form
    const manualDepositForm = document.getElementById('manualDepositForm');
    if (manualDepositForm) {
        manualDepositForm.addEventListener('submit', handleManualDeposit);
    }

    // Copy address button
    const copyAddressBtn = document.getElementById('copyAddressBtn');
    if (copyAddressBtn) {
        copyAddressBtn.addEventListener('click', copyAddress);
    }

    // Address input click (for easy selection)
    const walletAddress = document.getElementById('walletAddress');
    if (walletAddress) {
        walletAddress.addEventListener('click', function() {
            this.select();
        });
    }

    console.log('✅ تم تسجيل مستمعي أحداث الإيداع');
}

/**
 * Check authentication status
 */
async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/status');
        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = '/';
            return;
        }

        currentUser = data.user;

        // Update username display
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) {
            usernameDisplay.textContent = currentUser.username;
        }

    } catch (error) {
        console.error('خطأ في التحقق من المصادقة:', error);
        window.location.href = '/';
    }
}

/**
 * Load deposit information
 */
async function loadDepositInfo() {
    try {
        showLoadingState(true);

        const response = await fetch('/api/deposit-info');
        depositInfo = await response.json();

        if (response.ok) {
            displayDepositInfo();
        } else {
            throw new Error(depositInfo.error || 'خطأ في تحميل معلومات الإيداع');
        }
    } catch (error) {
        handleError(error, 'تحميل معلومات الإيداع');
        displayErrorState();
    } finally {
        showLoadingState(false);
    }
}

/**
 * Display deposit information
 */
function displayDepositInfo() {
    if (!depositInfo) return;

    // Validate TRX address format
    if (!isValidTRXAddress(depositInfo.address)) {
        handleError('عنوان المحفظة غير صحيح', 'التحقق من العنوان');
        return;
    }

    // Set wallet address
    const walletAddress = document.getElementById('walletAddress');
    if (walletAddress) {
        walletAddress.value = depositInfo.address;
    }

    // Set QR code with error handling
    const qrCodeImage = document.getElementById('qrCodeImage');
    if (qrCodeImage) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=png&data=${encodeURIComponent(depositInfo.address)}`;
        
        qrCodeImage.src = qrUrl;
        qrCodeImage.alt = `QR Code للعنوان: ${depositInfo.address}`;
        
        // Handle QR code load error
        qrCodeImage.onerror = function() {
            console.warn('فشل تحميل QR Code، محاولة مع خدمة بديلة...');
            this.src = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(depositInfo.address)}`;
            
            this.onerror = function() {
                console.error('فشل تحميل QR Code من جميع الخدمات');
                this.style.display = 'none';
                const container = this.parentElement;
                container.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        لا يمكن عرض رمز QR، يرجى نسخ العنوان يدوياً
                    </div>
                `;
            };
        };
    }

    console.log('✅ تم عرض معلومات الإيداع');
}

/**
 * Copy wallet address to clipboard
 */
async function copyAddress() {
    const walletAddress = document.getElementById('walletAddress');
    const copyBtn = document.getElementById('copyAddressBtn');
    
    if (!walletAddress || !walletAddress.value) {
        showToast('لا يوجد عنوان للنسخ', 'error');
        return;
    }

    const address = walletAddress.value;
    const originalBtnContent = copyBtn.innerHTML;
    
    try {
        // Change button state
        copyBtn.classList.add('copy-success');
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        
        // Copy to clipboard
        const success = await copyToClipboard(address, 'تم نسخ عنوان المحفظة بنجاح');
        
        if (success) {
            // Add visual feedback
            walletAddress.classList.add('bg-success', 'text-white');
            
            // Trigger haptic feedback on mobile
            if (navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }
            
            // Reset visual state after delay
            setTimeout(() => {
                walletAddress.classList.remove('bg-success', 'text-white');
                copyBtn.classList.remove('copy-success');
                copyBtn.innerHTML = originalBtnContent;
            }, 2000);
        }
        
    } catch (error) {
        copyBtn.classList.remove('copy-success');
        copyBtn.innerHTML = originalBtnContent;
        handleError(error, 'نسخ العنوان');
    }
}

/**
 * Handle manual deposit submission
 */
async function handleManualDeposit(event) {
    event.preventDefault();

    const amount = parseFloat(document.getElementById('depositAmount').value);
    const txHash = document.getElementById('txHash').value.trim();

    // Validation
    if (!amount || amount < 50) {
        showToast('الحد الأدنى للإيداع هو 50 TRX', 'error');
        return;
    }

    if (amount > 1000000) {
        showToast('المبلغ كبير جداً، يرجى التواصل مع الدعم', 'error');
        return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جار المعالجة...';

        const response = await fetch('/api/deposit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                txHash: txHash || null
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('تم إنشاء طلب الإيداع بنجاح! سيتم تأكيده خلال 1-3 دقائق', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('manualDepositModal'));
            if (modal) {
                modal.hide();
            }
            
            // Clear form
            event.target.reset();
            
            // Show success animation
            showDepositSuccessAnimation();
            
        } else {
            showToast(data.error || 'خطأ في إنشاء طلب الإيداع', 'error');
        }
    } catch (error) {
        console.error('خطأ في إنشاء الإيداع:', error);
        showToast('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Implement address security measures
 */
function implementAddressSecurity() {
    // Encrypt address in localStorage (basic obfuscation)
    const encryptAddress = (address) => {
        return btoa(address + new Date().getTime());
    };

    // Store encrypted address
    if (depositInfo && depositInfo.address) {
        localStorage.setItem('encrypted_addr', encryptAddress(depositInfo.address));
    }

    // Implement right-click protection on address
    const walletAddress = document.getElementById('walletAddress');
    if (walletAddress) {
        walletAddress.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showToast('استخدم زر النسخ للحصول على العنوان', 'info');
        });
    }

    console.log('🔒 تم تطبيق الإجراءات الأمنية');
}

/**
 * Validate TRON address format
 */
function isValidTRXAddress(address) {
    if (!address || typeof address !== 'string') {
        return false;
    }

    // TRON address regex: starts with T, followed by 33 alphanumeric characters
    const trxRegex = /^T[a-zA-Z0-9]{33}$/;
    return trxRegex.test(address);
}

/**
 * Show loading state
 */
function showLoadingState(show) {
    const walletAddress = document.getElementById('walletAddress');
    const qrCodeImage = document.getElementById('qrCodeImage');
    const copyBtn = document.getElementById('copyAddressBtn');

    if (show) {
        if (walletAddress) walletAddress.value = 'جار التحميل...';
        if (qrCodeImage) qrCodeImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+';
        if (copyBtn) copyBtn.disabled = true;
    } else {
        if (copyBtn) copyBtn.disabled = false;
    }
}

/**
 * Display error state
 */
function displayErrorState() {
    const container = document.querySelector('.deposit-card .card-body');
    if (container) {
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h5>خطأ في تحميل معلومات الإيداع</h5>
                <p class="text-muted">يرجى إعادة تحميل الصفحة أو التواصل مع الدعم</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-sync-alt me-2"></i>إعادة التحميل
                </button>
            </div>
        `;
    }
}

/**
 * Show deposit success animation
 */
function showDepositSuccessAnimation() {
    // Create success overlay
    const overlay = document.createElement('div');
    overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.zIndex = '9999';
    
    overlay.innerHTML = `
        <div class="text-center text-white">
            <div class="mb-4">
                <i class="fas fa-check-circle fa-5x text-success bounce-in"></i>
            </div>
            <h3 class="fade-in">تم إنشاء طلب الإيداع!</h3>
            <p class="fade-in">سيتم تأكيد الإيداع خلال 1-3 دقائق</p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Remove overlay after 3 seconds
    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(overlay);
        }, 500);
    }, 3000);
}

/**
 * Auto-hide Telegram support on scroll (mobile optimization)
 */
function optimizeTelegramSupport() {
    const telegramSupport = document.querySelector('.telegram-support');
    if (!telegramSupport) return;

    let lastScrollTop = 0;
    let scrollTimer = null;

    window.addEventListener('scroll', function() {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (window.innerWidth <= 768) {
            if (currentScrollTop > lastScrollTop && currentScrollTop > 100) {
                // Scrolling down
                telegramSupport.style.transform = 'translateX(-50%) translateY(100px)';
            } else {
                // Scrolling up
                telegramSupport.style.transform = 'translateX(-50%) translateY(0)';
            }
        }
        
        lastScrollTop = currentScrollTop;
        
        // Clear previous timer
        clearTimeout(scrollTimer);
        
        // Show support button after scroll stops
        scrollTimer = setTimeout(() => {
            if (window.innerWidth <= 768) {
                telegramSupport.style.transform = 'translateX(-50%) translateY(0)';
            }
        }, 150);
    });
}

/**
 * Logout function
 */
async function logout() {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
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

// Initialize mobile optimizations
optimizeTelegramSupport();

// Auto-refresh deposit info every 2 minutes
setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadDepositInfo();
    }
}, 120000);

// Utility functions
function showToast(message, type = 'info') {
    const toastElement = document.getElementById('alertToast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toastElement || !toastMessage) return;

    toastMessage.textContent = message;
    
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

    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: type === 'error' ? 5000 : 3000
    });
    toast.show();
}

function handleError(error, context = '') {
    console.error(`خطأ في ${context}:`, error);
    const message = typeof error === 'string' ? error : (error.message || 'حدث خطأ غير متوقع');
    showToast(message, 'error');
}

async function copyToClipboard(text, successMessage = 'تم النسخ بنجاح') {
    try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage, 'success');
        return true;
    } catch (error) {
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

console.log('✅ تم تحميل JavaScript صفحة الإيداع');
