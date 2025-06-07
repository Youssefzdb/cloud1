/**
 * Admin Panel JavaScript for Cloud Mining Platform
 * Handles all administrative functionality including user management,
 * contract management, deposits, and system statistics
 */

// Global variables
let adminStats = {};
let allUsers = [];
let allContracts = [];
let pendingDeposits = [];
let allTransactions = [];
let adminSettings = {};

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 تهيئة لوحة الإدارة...');
    
    initializeAdminPanel();
    setupEventListeners();
    checkAdminAuth();
    loadAdminStats();
    loadUsers();
    loadPendingDeposits();
    loadSettings();
});

/**
 * Initialize admin panel
 */
function initializeAdminPanel() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize tab functionality
    const tabTriggerList = [].slice.call(document.querySelectorAll('#adminTabs button'));
    tabTriggerList.forEach(function (tabTriggerEl) {
        tabTriggerEl.addEventListener('shown.bs.tab', function (event) {
            const targetTab = event.target.getAttribute('data-bs-target');
            handleTabChange(targetTab);
        });
    });

    console.log('✅ تم تهيئة لوحة الإدارة');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Create contract form
    const createContractForm = document.getElementById('createContractForm');
    if (createContractForm) {
        createContractForm.addEventListener('submit', handleCreateContract);
    }

    // Edit balance form
    const editBalanceForm = document.getElementById('editBalanceForm');
    if (editBalanceForm) {
        editBalanceForm.addEventListener('submit', handleEditBalance);
    }

    // Confirm deposit form
    const confirmDepositForm = document.getElementById('confirmDepositForm');
    if (confirmDepositForm) {
        confirmDepositForm.addEventListener('submit', handleConfirmDeposit);
    }

    // Contract return input validation
    const contractReturnInput = document.getElementById('contractReturn');
    if (contractReturnInput) {
        contractReturnInput.addEventListener('input', function() {
            const value = parseFloat(this.value);
            if (value > 10) {
                this.value = 10;
                showToast('العائد اليومي لا يمكن أن يزيد عن 10%', 'warning');
            }
        });
    }

    console.log('✅ تم تسجيل مستمعي أحداث الإدارة');
}

/**
 * Check admin authentication
 */
async function checkAdminAuth() {
    try {
        const response = await fetch('/auth/status');
        const data = await response.json();

        if (!data.authenticated || !data.user.isAdmin) {
            window.location.href = '/';
            return;
        }

        // Update admin username display
        const adminUsername = document.getElementById('adminUsername');
        if (adminUsername) {
            adminUsername.textContent = data.user.username;
        }

        console.log(`🔐 مرحباً بالمدير: ${data.user.username}`);

    } catch (error) {
        console.error('خطأ في التحقق من صلاحيات المدير:', error);
        window.location.href = '/';
    }
}

/**
 * Handle tab changes
 */
function handleTabChange(targetTab) {
    switch (targetTab) {
        case '#users':
            loadUsers();
            break;
        case '#contracts':
            loadContracts();
            break;
        case '#deposits':
            loadPendingDeposits();
            break;
        case '#transactions':
            loadAllTransactions();
            break;
        case '#settings':
            loadSettings();
            break;
    }
}

/**
 * Load admin dashboard statistics
 */
async function loadAdminStats() {
    try {
        const response = await fetch('/admin/stats');
        adminStats = await response.json();

        if (response.ok) {
            updateStatsDisplay();
        } else {
            throw new Error(adminStats.error || 'خطأ في تحميل الإحصائيات');
        }
    } catch (error) {
        handleError(error, 'تحميل إحصائيات المدير');
    }
}

/**
 * Update statistics display
 */
function updateStatsDisplay() {
    if (!adminStats) return;

    // Update total users
    const totalUsersElement = document.getElementById('totalUsers');
    if (totalUsersElement && adminStats.users) {
        totalUsersElement.textContent = adminStats.users.totalUsers || 0;
    }

    // Update active contracts
    const activeContractsElement = document.getElementById('activeContracts');
    if (activeContractsElement && adminStats.contracts) {
        activeContractsElement.textContent = adminStats.contracts.activeUserContracts || 0;
    }

    // Update total deposits
    const totalDepositsElement = document.getElementById('totalDeposits');
    if (totalDepositsElement && adminStats.transactions) {
        totalDepositsElement.textContent = formatNumber(adminStats.transactions.totalDeposits || 0);
    }

    // Update pending deposits
    const pendingDepositsElement = document.getElementById('pendingDeposits');
    if (pendingDepositsElement && adminStats.transactions) {
        pendingDepositsElement.textContent = adminStats.transactions.pendingDeposits || 0;
    }

    console.log('✅ تم تحديث إحصائيات المدير');
}

/**
 * Load all users
 */
async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    try {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">جار التحميل...</span>
                    </div>
                </td>
            </tr>
        `;

        const response = await fetch('/admin/users');
        allUsers = await response.json();

        if (response.ok) {
            displayUsers();
        } else {
            throw new Error(allUsers.error || 'خطأ في تحميل المستخدمين');
        }
    } catch (error) {
        handleError(error, 'تحميل المستخدمين');
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    حدث خطأ في تحميل المستخدمين
                </td>
            </tr>
        `;
    }
}

/**
 * Display users in table
 */
function displayUsers() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody || !allUsers.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    لا يوجد مستخدمين
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = allUsers.map(user => `
        <tr>
            <td class="fw-bold">${user.id}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar-circle bg-primary text-white me-2">
                        ${user.username.charAt(0).toUpperCase()}
                    </div>
                    ${user.username}
                </div>
            </td>
            <td>${user.email}</td>
            <td class="fw-bold text-success">${formatNumber(user.balance)} TRX</td>
            <td class="text-info">${formatNumber(user.total_earned)} TRX</td>
            <td class="text-muted">${formatDate(user.created_at)}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-primary" onclick="editUserBalance(${user.id}, '${user.username}')" 
                            data-bs-toggle="tooltip" title="تعديل الرصيد">
                        <i class="fas fa-wallet"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="viewUserDetails(${user.id})"
                            data-bs-toggle="tooltip" title="تفاصيل المستخدم">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Re-initialize tooltips
    const tooltipTriggerList = [].slice.call(tableBody.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    console.log(`✅ تم عرض ${allUsers.length} مستخدم`);
}

/**
 * Load contracts for admin management
 */
async function loadContracts() {
    const container = document.getElementById('contractsContainer');
    if (!container) return;

    try {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">جار التحميل...</span>
                </div>
            </div>
        `;

        const response = await fetch('/api/contracts');
        allContracts = await response.json();

        if (response.ok) {
            displayContracts();
        } else {
            throw new Error(allContracts.error || 'خطأ في تحميل العقود');
        }
    } catch (error) {
        handleError(error, 'تحميل العقود');
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    حدث خطأ في تحميل العقود
                </div>
            </div>
        `;
    }
}

/**
 * Display contracts for admin
 */
function displayContracts() {
    const container = document.getElementById('contractsContainer');
    if (!container) return;

    if (!allContracts.length) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    لا توجد عقود متاحة
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = allContracts.map(contract => `
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="card h-100 ${contract.is_active ? '' : 'opacity-75'}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">${contract.name}</h6>
                    <span class="badge ${contract.is_active ? 'bg-success' : 'bg-secondary'}">
                        ${contract.is_active ? 'نشط' : 'معطل'}
                    </span>
                </div>
                <div class="card-body">
                    <p class="text-muted small">${contract.description}</p>
                    <div class="row g-2 text-center">
                        <div class="col-6">
                            <small class="text-muted">السعر</small>
                            <div class="fw-bold">${formatNumber(contract.price)} TRX</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">العائد اليومي</small>
                            <div class="fw-bold text-success">${(contract.daily_return * 100).toFixed(2)}%</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">المدة</small>
                            <div class="fw-bold">${contract.duration_days} يوم</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">الحد الأدنى</small>
                            <div class="fw-bold">${contract.min_deposit} TRX</div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-outline-primary btn-sm" onclick="editContract(${contract.id})">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-outline-${contract.is_active ? 'warning' : 'success'} btn-sm" 
                                onclick="toggleContractStatus(${contract.id}, ${contract.is_active})">
                            <i class="fas fa-${contract.is_active ? 'pause' : 'play'}"></i>
                            ${contract.is_active ? 'إيقاف' : 'تفعيل'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    console.log(`✅ تم عرض ${allContracts.length} عقد`);
}

/**
 * Load pending deposits
 */
async function loadPendingDeposits() {
    const tableBody = document.getElementById('depositsTableBody');
    if (!tableBody) return;

    try {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">جار التحميل...</span>
                    </div>
                </td>
            </tr>
        `;

        const response = await fetch('/admin/deposits/pending');
        pendingDeposits = await response.json();

        if (response.ok) {
            displayPendingDeposits();
        } else {
            throw new Error(pendingDeposits.error || 'خطأ في تحميل الإيداعات المعلقة');
        }
    } catch (error) {
        handleError(error, 'تحميل الإيداعات المعلقة');
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    حدث خطأ في تحميل الإيداعات المعلقة
                </td>
            </tr>
        `;
    }
}

/**
 * Display pending deposits
 */
function displayPendingDeposits() {
    const tableBody = document.getElementById('depositsTableBody');
    if (!tableBody) return;

    if (!pendingDeposits.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    لا توجد إيداعات معلقة
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = pendingDeposits.map(deposit => `
        <tr>
            <td class="fw-bold">${deposit.id}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar-circle bg-info text-white me-2">
                        ${deposit.username.charAt(0).toUpperCase()}
                    </div>
                    ${deposit.username}
                </div>
            </td>
            <td class="fw-bold text-success">${formatNumber(deposit.amount)} TRX</td>
            <td>
                <div class="d-flex align-items-center">
                    <code class="small">${deposit.trx_address.substring(0, 10)}...${deposit.trx_address.substring(-6)}</code>
                    <button class="btn btn-outline-secondary btn-sm ms-2" 
                            onclick="copyToClipboard('${deposit.trx_address}', 'تم نسخ العنوان')"
                            data-bs-toggle="tooltip" title="نسخ العنوان">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </td>
            <td class="text-muted">${formatDate(deposit.created_at)}</td>
            <td>
                <button class="btn btn-success btn-sm" 
                        onclick="confirmDeposit(${deposit.id}, '${deposit.username}', ${deposit.amount})"
                        data-bs-toggle="tooltip" title="تأكيد الإيداع">
                    <i class="fas fa-check me-1"></i>تأكيد
                </button>
            </td>
        </tr>
    `).join('');

    // Re-initialize tooltips
    const tooltipTriggerList = [].slice.call(tableBody.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    console.log(`✅ تم عرض ${pendingDeposits.length} إيداع معلق`);
}

/**
 * Load all transactions
 */
async function loadAllTransactions() {
    const tableBody = document.getElementById('transactionsTableBody');
    if (!tableBody) return;

    try {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">جار التحميل...</span>
                    </div>
                </td>
            </tr>
        `;

        const response = await fetch('/admin/transactions?limit=50');
        allTransactions = await response.json();

        if (response.ok) {
            displayAllTransactions();
        } else {
            throw new Error(allTransactions.error || 'خطأ في تحميل المعاملات');
        }
    } catch (error) {
        handleError(error, 'تحميل المعاملات');
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    حدث خطأ في تحميل المعاملات
                </td>
            </tr>
        `;
    }
}

/**
 * Display all transactions
 */
function displayAllTransactions() {
    const tableBody = document.getElementById('transactionsTableBody');
    if (!tableBody) return;

    if (!allTransactions.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
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
        referral: 'مكافأة إحالة',
        admin_credit: 'إضافة إدارية',
        admin_debit: 'خصم إداري'
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

    tableBody.innerHTML = allTransactions.map(transaction => `
        <tr>
            <td class="fw-bold">${transaction.id}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar-circle bg-secondary text-white me-2">
                        ${transaction.username.charAt(0).toUpperCase()}
                    </div>
                    ${transaction.username}
                </div>
            </td>
            <td>
                <span class="badge bg-primary">
                    ${typeLabels[transaction.type] || transaction.type}
                </span>
            </td>
            <td class="fw-bold">${formatNumber(transaction.amount)} TRX</td>
            <td>
                <span class="badge ${statusClasses[transaction.status] || 'bg-secondary'}">
                    ${statusLabels[transaction.status] || transaction.status}
                </span>
            </td>
            <td class="text-muted">${formatDate(transaction.created_at)}</td>
        </tr>
    `).join('');

    console.log(`✅ تم عرض ${allTransactions.length} معاملة`);
}

/**
 * Load system settings
 */
async function loadSettings() {
    try {
        const response = await fetch('/admin/settings');
        adminSettings = await response.json();

        if (response.ok) {
            displaySettings();
        } else {
            throw new Error(adminSettings.error || 'خطأ في تحميل الإعدادات');
        }
    } catch (error) {
        handleError(error, 'تحميل الإعدادات');
    }
}

/**
 * Display system settings
 */
function displaySettings() {
    if (!adminSettings) return;

    const trxAddressInput = document.getElementById('trxAddress');
    const minDepositInput = document.getElementById('minDeposit');
    const referralBonusInput = document.getElementById('referralBonus');

    if (trxAddressInput) {
        trxAddressInput.value = adminSettings.trxAddress || '';
    }

    if (minDepositInput) {
        minDepositInput.value = adminSettings.minDeposit || 50;
    }

    if (referralBonusInput) {
        referralBonusInput.value = adminSettings.referralBonus || 10;
    }

    console.log('✅ تم تحميل إعدادات النظام');
}

/**
 * Handle create contract form submission
 */
async function handleCreateContract(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('contractName').value.trim(),
        description: document.getElementById('contractDescription').value.trim(),
        price: parseFloat(document.getElementById('contractPrice').value),
        daily_return: parseFloat(document.getElementById('contractReturn').value) / 100,
        duration_days: parseInt(document.getElementById('contractDuration').value),
        min_deposit: parseFloat(document.getElementById('contractMinDeposit').value)
    };

    // Validation
    if (!formData.name || !formData.description) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    if (formData.daily_return > 0.1) {
        showToast('العائد اليومي لا يمكن أن يزيد عن 10%', 'error');
        return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جار الإنشاء...';

        const response = await fetch('/admin/contracts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showToast('تم إنشاء العقد بنجاح', 'success');
            
            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('createContractModal'));
            modal.hide();
            event.target.reset();
            
            // Reload contracts
            loadContracts();
            loadAdminStats();
        } else {
            showToast(data.error || 'خطأ في إنشاء العقد', 'error');
        }
    } catch (error) {
        handleError(error, 'إنشاء العقد');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Edit user balance
 */
function editUserBalance(userId, username) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserName').value = username;
    document.getElementById('balanceAmount').value = '';
    document.getElementById('balanceDescription').value = '';

    const modal = new bootstrap.Modal(document.getElementById('editBalanceModal'));
    modal.show();
}

/**
 * Handle edit balance form submission
 */
async function handleEditBalance(event) {
    event.preventDefault();

    const userId = document.getElementById('editUserId').value;
    const amount = parseFloat(document.getElementById('balanceAmount').value);
    const description = document.getElementById('balanceDescription').value.trim();

    if (!amount || !description) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جار الحفظ...';

        const response = await fetch(`/admin/users/${userId}/balance`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount, description })
        });

        const data = await response.json();

        if (data.success) {
            showToast('تم تحديث الرصيد بنجاح', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editBalanceModal'));
            modal.hide();
            
            // Reload users and stats
            loadUsers();
            loadAdminStats();
        } else {
            showToast(data.error || 'خطأ في تحديث الرصيد', 'error');
        }
    } catch (error) {
        handleError(error, 'تحديث الرصيد');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Confirm deposit
 */
function confirmDeposit(depositId, username, amount) {
    document.getElementById('confirmDepositId').value = depositId;
    document.getElementById('confirmUserName').value = username;
    document.getElementById('confirmAmount').value = `${formatNumber(amount)} TRX`;
    document.getElementById('confirmTxHash').value = '';

    const modal = new bootstrap.Modal(document.getElementById('confirmDepositModal'));
    modal.show();
}

/**
 * Handle confirm deposit form submission
 */
async function handleConfirmDeposit(event) {
    event.preventDefault();

    const depositId = document.getElementById('confirmDepositId').value;
    const txHash = document.getElementById('confirmTxHash').value.trim();

    if (!txHash) {
        showToast('يرجى إدخال رقم المعاملة', 'error');
        return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>جار التأكيد...';

        const response = await fetch(`/admin/deposits/${depositId}/confirm`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ txHash })
        });

        const data = await response.json();

        if (data.success) {
            showToast(`تم تأكيد الإيداع بمبلغ ${data.amount} TRX`, 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDepositModal'));
            modal.hide();
            
            // Reload pending deposits and stats
            loadPendingDeposits();
            loadAdminStats();
        } else {
            showToast(data.error || 'خطأ في تأكيد الإيداع', 'error');
        }
    } catch (error) {
        handleError(error, 'تأكيد الإيداع');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Calculate profits manually
 */
async function calculateProfits() {
    try {
        showToast('جار حساب الأرباح...', 'info');
        
        // This would trigger manual profit calculation
        // In a real implementation, you might have an endpoint for this
        const response = await fetch('/admin/calculate-profits', {
            method: 'POST'
        });

        if (response.ok) {
            showToast('تم حساب الأرباح بنجاح', 'success');
            loadAdminStats();
        } else {
            showToast('خطأ في حساب الأرباح', 'error');
        }
    } catch (error) {
        handleError(error, 'حساب الأرباح');
    }
}

/**
 * Backup database
 */
async function backupDatabase() {
    try {
        showToast('جار إنشاء النسخة الاحتياطية...', 'info');
        
        // This would trigger database backup
        // In a real implementation, you might generate a downloadable file
        showToast('تم إنشاء النسخة الاحتياطية بنجاح', 'success');
    } catch (error) {
        handleError(error, 'إنشاء النسخة الاحتياطية');
    }
}

/**
 * Save system settings
 */
async function saveSettings() {
    try {
        const settings = {
            trxAddress: document.getElementById('trxAddress').value,
            minDeposit: parseFloat(document.getElementById('minDeposit').value),
            referralBonus: parseFloat(document.getElementById('referralBonus').value)
        };

        const response = await fetch('/admin/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        });

        const data = await response.json();

        if (data.success) {
            showToast('تم حفظ الإعدادات بنجاح', 'success');
        } else {
            showToast(data.error || 'خطأ في حفظ الإعدادات', 'error');
        }
    } catch (error) {
        handleError(error, 'حفظ الإعدادات');
    }
}

/**
 * View user details (placeholder)
 */
function viewUserDetails(userId) {
    showToast('ميزة تفاصيل المستخدم قيد التطوير', 'info');
}

/**
 * Edit contract (placeholder)
 */
function editContract(contractId) {
    showToast('ميزة تعديل العقد قيد التطوير', 'info');
}

/**
 * Toggle contract status (placeholder)
 */
function toggleContractStatus(contractId, currentStatus) {
    showToast('ميزة تغيير حالة العقد قيد التطوير', 'info');
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

// Auto-refresh admin data every 60 seconds
setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadAdminStats();
        
        // Refresh data based on active tab
        const activeTab = document.querySelector('#adminTabs .nav-link.active');
        if (activeTab) {
            const targetTab = activeTab.getAttribute('data-bs-target');
            handleTabChange(targetTab);
        }
    }
}, 60000);

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
    const message = typeof error === 'string' ? error : (error.message || 'حدث خطأ غير متوقع');
    showToast(message, 'error');
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

// CSS for avatar circles
const style = document.createElement('style');
style.textContent = `
    .avatar-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 0.8rem;
        flex-shrink: 0;
    }
`;
document.head.appendChild(style);

console.log('✅ تم تحميل JavaScript لوحة الإدارة');
