/**
 * Dashboard JavaScript for Cloud Mining Platform
 * Handles user dashboard functionality, contracts, and transactions
 */

// Global variables
let userProfile = null;
let userContracts = [];
let userTransactions = [];
let availableContracts = [];

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 تهيئة لوحة التحكم...');
    
    initializeDashboard();
    setupEventListeners();
    loadUserProfile();
    loadUserContracts();
    loadTransactions();
    loadAvailableContracts();
});

/**
 * Initialize dashboard
 */
function initializeDashboard() {
    // Check authentication
    checkAuthStatus();
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    console.log('✅ تم تهيئة لوحة التحكم');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Purchase form
    const purchaseForm = document.getElementById('purchaseForm');
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', handlePurchaseContract);
    }

    // Investment amount input
    const investmentAmount = document.getElementById('investmentAmount');
    if (investmentAmount) {
        investmentAmount.addEventListener('input', updateExpectedReturns);
    }

    // Modal events
    const contractsModal = document.getElementById('contractsModal');
    if (contractsModal) {
        contractsModal.addEventListener('shown.bs.modal', loadContractsModal);
    }

    const referralModal = document.getElementById('referralModal');
    if (referralModal) {
        referralModal.addEventListener('shown.bs.modal', loadReferralInfo);
    }

    console.log('✅ تم تسجيل مستمعي الأحداث');
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

        // Update username display
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) {
            usernameDisplay.textContent = data.user.username;
        }

        // Show admin panel link if user is admin
        const adminPanelLink = document.getElementById('adminPanelLink');
        if (adminPanelLink && data.user.isAdmin) {
            adminPanelLink.style.display = 'block';
            adminPanelLink.href = '/admin-panel';
        }

    } catch (error) {
        console.error('خطأ في التحقق من المصادقة:', error);
        window.location.href = '/';
    }
}

/**
 * Load user profile and statistics
 */
async function loadUserProfile() {
    try {
        const response = await fetch('/api/profile');
        userProfile = await response.json();

        if (response.ok) {
            updateProfileStats();
        } else {
            handleError(userProfile.error || 'خطأ في تحميل البيانات');
        }
    } catch (error) {
        handleError(error, 'تحميل بيانات المستخدم');
    }
}

/**
 * Update profile statistics in UI
 */
function updateProfileStats() {
    if (!userProfile) return;

    // Update balance
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
        balanceElement.textContent = formatNumber(userProfile.balance);
    }

    // Update total earned
    const earnedElement = document.getElementById('totalEarned');
    if (earnedElement) {
        earnedElement.textContent = formatNumber(userProfile.total_earned);
    }

    // Update active contracts
    const contractsElement = document.getElementById('activeContracts');
    if (contractsElement) {
        contractsElement.textContent = userProfile.activeContracts || 0;
    }

    // Update referrals count
    const referralsElement = document.getElementById('referralsCount');
    if (referralsElement) {
        referralsElement.textContent = userProfile.referralsCount || 0;
    }

    console.log('✅ تم تحديث إحصائيات المستخدم');
}

/**
 * Load user contracts
 */
async function loadUserContracts() {
    const container = document.getElementById('userContractsContainer');
    if (!container) return;

    try {
        const response = await fetch('/api/user-contracts');
        userContracts = await response.json();

        if (response.ok) {
            displayUserContracts();
        } else {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${userContracts.error || 'خطأ في تحميل العقود'}
                </div>
            `;
        }
    } catch (error) {
        console.error('خطأ في تحميل العقود:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                حدث خطأ في تحميل العقود
            </div>
        `;
    }
}

/**
 * Display user contracts
 */
function displayUserContracts() {
    const container = document.getElementById('userContractsContainer');
    if (!container) return;

    if (userContracts.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-file-contract fa-3x mb-3 opacity-50"></i>
                <p>لا توجد عقود نشطة</p>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#contractsModal">
                    <i class="fas fa-plus me-2"></i>شراء عقد جديد
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = userContracts.map(contract => {
        const startDate = new Date(contract.start_date);
        const endDate = new Date(contract.end_date);
        const now = new Date();
        const isActive = contract.is_active && now <= endDate;
        const daysLeft = isActive ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;
        
        return `
            <div class="card mb-3 ${isActive ? '' : 'opacity-75'}">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <h6 class="fw-bold mb-1">${contract.contract_name}</h6>
                            <small class="text-muted">${contract.description}</small>
                        </div>
                        <div class="col-md-2 text-center">
                            <small class="text-muted">المبلغ المستثمر</small>
                            <div class="fw-bold text-primary">${formatNumber(contract.amount)} TRX</div>
                        </div>
                        <div class="col-md-2 text-center">
                            <small class="text-muted">الربح اليومي</small>
                            <div class="fw-bold text-success">${formatNumber(contract.daily_profit)} TRX</div>
                        </div>
                        <div class="col-md-2 text-center">
                            <small class="text-muted">إجمالي الأرباح</small>
                            <div class="fw-bold text-info">${formatNumber(contract.total_profit)} TRX</div>
                        </div>
                        <div class="col-md-2 text-center">
                            <small class="text-muted">الأيام المتبقية</small>
                            <div class="fw-bold ${isActive ? 'text-warning' : 'text-muted'}">${daysLeft} يوم</div>
                        </div>
                        <div class="col-md-1 text-center">
                            <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">
                                ${isActive ? 'نشط' : 'منتهي'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    console.log(`✅ تم عرض ${userContracts.length} عقد`);
}

/**
 * Load transactions
 */
async function loadTransactions() {
    const tableBody = document.getElementById('transactionsTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch('/api/transactions');
        userTransactions = await response.json();

        if (response.ok) {
            displayTransactions();
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        ${userTransactions.error || 'خطأ في تحميل المعاملات'}
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('خطأ في تحميل المعاملات:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    حدث خطأ في تحميل المعاملات
                </td>
            </tr>
        `;
    }
}

/**
 * Display transactions
 */
function displayTransactions() {
    const tableBody = document.getElementById('transactionsTableBody');
    if (!tableBody) return;

    if (userTransactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    لا توجد معاملات
                </td>
            </tr>
        `;
        return;
    }

    const typeLabels = {
        deposit: 'إيداع',
        withdrawal: 'سحب',
        profit: 'ربح',
        purchase: 'شراء عقد',
        referral: 'مكافأة إحالة'
    };

    const statusLabels = {
        pending: 'معلق',
        completed: 'مكتمل',
        failed: 'فاشل'
    };

    const statusClasses = {
        pending: 'bg-warning',
        completed: 'bg-success',
        failed: 'bg-danger'
    };

    tableBody.innerHTML = userTransactions.slice(0, 10).map(transaction => `
        <tr>
            <td>
                <span class="badge bg-primary">${typeLabels[transaction.type] || transaction.type}</span>
            </td>
            <td class="fw-bold">${formatNumber(transaction.amount)} TRX</td>
            <td>
                <span class="badge ${statusClasses[transaction.status] || 'bg-secondary'}">
                    ${statusLabels[transaction.status] || transaction.status}
                </span>
            </td>
            <td>${transaction.description || '-'}</td>
            <td class="text-muted">${formatDate(transaction.created_at)}</td>
        </tr>
    `).join('');

    console.log(`✅ تم عرض ${userTransactions.length} معاملة`);
}

/**
 * Load available contracts for modal
 */
async function loadAvailableContracts() {
    try {
        const response = await fetch('/api/contracts');
        availableContracts = await response.json();
        console.log(`✅ تم تحميل ${availableContracts.length} عقد متاح`);
    } catch (error) {
        console.error('خطأ في تحميل العقود المتاحة:', error);
    }
}

/**
 * Load contracts in modal
 */
function loadContractsModal() {
    const container = document.getElementById('modalContractsContainer');
    if (!container || !availableContracts.length) return;

    container.innerHTML = availableContracts.map(contract => `
        <div class="col-md-6 mb-3">
            <div class="card h-100">
                <div class="card-header bg-primary text-white">
                    <h6 class="mb-0">${contract.name}</h6>
                </div>
                <div class="card-body">
                    <p class="text-muted small">${contract.description}</p>
                    <ul class="list-unstyled small">
                        <li><i class="fas fa-coins text-warning me-2"></i>الحد الأدنى: ${contract.min_deposit} TRX</li>
                        <li><i class="fas fa-chart-line text-success me-2"></i>العائد اليومي: ${(contract.daily_return * 100).toFixed(2)}%</li>
                        <li><i class="fas fa-calendar text-info me-2"></i>المدة: ${contract.duration_days} يوم</li>
                    </ul>
                </div>
                <div class="card-footer">
                    <button class="btn btn-success btn-sm w-100" onclick="selectContract(${contract.id})">
                        <i class="fas fa-shopping-cart me-2"></i>شراء
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Select contract for purchase
 */
function selectContract(contractId) {
    const contract = availableContracts.find(c => c.id === contractId);
    if (!contract) return;

    // Hide contracts modal
    const contractsModal = bootstrap.Modal.getInstance(document.getElementById('contractsModal'));
    contractsModal.hide();

    // Set contract details in purchase modal
    document.getElementById('selectedContractId').value = contract.id;
    document.getElementById('selectedContractName').textContent = contract.name;
    document.getElementById('selectedContractDetails').textContent = 
        `العائد اليومي: ${(contract.daily_return * 100).toFixed(2)}% | المدة: ${contract.duration_days} يوم`;
    document.getElementById('minAmount').textContent = contract.min_deposit;
    document.getElementById('investmentAmount').min = contract.min_deposit;
    document.getElementById('investmentAmount').value = contract.min_deposit;

    // Update expected returns
    updateExpectedReturns();

    // Show purchase modal
    setTimeout(() => {
        const purchaseModal = new bootstrap.Modal(document.getElementById('purchaseModal'));
        purchaseModal.show();
    }, 300);
}

/**
 * Update expected returns calculation
 */
function updateExpectedReturns() {
    const contractId = document.getElementById('selectedContractId').value;
    const amount = parseFloat(document.getElementById('investmentAmount').value) || 0;
    
    if (!contractId || !amount) return;

    const contract = availableContracts.find(c => c.id == contractId);
    if (!contract) return;

    const dailyReturn = amount * contract.daily_return;
    const totalReturn = dailyReturn * contract.duration_days;

    document.getElementById('expectedDaily').textContent = `${formatNumber(dailyReturn)} TRX`;
    document.getElementById('expectedTotal').textContent = `${formatNumber(totalReturn)} TRX`;
}

/**
 * Handle contract purchase
 */
async function handlePurchaseContract(event) {
    event.preventDefault();

    const contractId = document.getElementById('selectedContractId').value;
    const amount = parseFloat(document.getElementById('investmentAmount').value);

    if (!contractId || !amount) {
        showToast('يرجى ملء جميع البيانات', 'error');
        return;
    }

    if (!userProfile || userProfile.balance < amount) {
        showToast('الرصيد غير كافي لشراء هذا العقد', 'error');
        return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جار الشراء...';

        const response = await fetch('/api/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contractId: parseInt(contractId),
                amount: amount
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('تم شراء العقد بنجاح', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
            modal.hide();
            
            // Reload data
            setTimeout(() => {
                loadUserProfile();
                loadUserContracts();
                loadTransactions();
            }, 1000);
        } else {
            showToast(data.error || 'خطأ في شراء العقد', 'error');
        }
    } catch (error) {
        console.error('خطأ في شراء العقد:', error);
        showToast('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Load referral information
 */
async function loadReferralInfo() {
    try {
        const response = await fetch('/api/referral');
        const data = await response.json();

        if (response.ok) {
            document.getElementById('referralCode').value = data.referralCode;
            document.getElementById('referralUrl').value = data.referralUrl;
        } else {
            showToast(data.error || 'خطأ في تحميل معلومات الإحالة', 'error');
        }
    } catch (error) {
        console.error('خطأ في تحميل معلومات الإحالة:', error);
        showToast('حدث خطأ في تحميل معلومات الإحالة', 'error');
    }
}

/**
 * Copy referral code
 */
async function copyReferralCode() {
    const code = document.getElementById('referralCode').value;
    await copyToClipboard(code, 'تم نسخ كود الإحالة');
}

/**
 * Copy referral URL
 */
async function copyReferralUrl() {
    const url = document.getElementById('referralUrl').value;
    await copyToClipboard(url, 'تم نسخ رابط الإحالة');
}

/**
 * Share referral link
 */
function shareReferral() {
    const url = document.getElementById('referralUrl').value;
    const text = `انضم إلى منصة التعدين السحابي واحصل على أرباح يومية مضمونة!\n\n${url}`;

    if (navigator.share) {
        navigator.share({
            title: 'منصة التعدين السحابي',
            text: text,
            url: url
        }).catch(console.error);
    } else {
        copyToClipboard(text, 'تم نسخ رابط الإحالة للمشاركة');
    }
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

/**
 * Auto-refresh data every 30 seconds
 */
setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadUserProfile();
        loadTransactions();
    }
}, 30000);

// Utility functions (imported from main.js concepts)
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

function formatNumber(number, decimals = 2) {
    return new Intl.NumberFormat('ar-SA', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function handleError(error, context = '') {
    console.error(`خطأ في ${context}:`, error);
    showToast(typeof error === 'string' ? error : 'حدث خطأ غير متوقع', 'error');
}

async function copyToClipboard(text, successMessage = 'تم النسخ بنجاح') {
    try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage, 'success');
        return true;
    } catch (error) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showToast(successMessage, 'success');
            return true;
        } catch (fallbackError) {
            showToast('فشل في النسخ', 'error');
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

console.log('✅ تم تحميل JavaScript لوحة التحكم');
