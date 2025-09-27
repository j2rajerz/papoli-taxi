// داده‌های برنامه
let passengers = [];
let transactions = [];
let currentEditingId = null;
let gistId = '';
let githubToken = ''; // توکن هاردکد شده حذف شد
let isOnline = false;

// توابع ذخیره‌سازی ابری با GitHub Gist
async function saveToGist() {
    if (!gistId) {
        return await createNewGist();
    }

    const data = {
        passengers: passengers,
        transactions: transactions,
        lastUpdated: new Date().toISOString(),
        appVersion: '2.0'
    };

    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: 'Ms. Papli Service Management Data - ذخیره شده در: ' + new Date().toLocaleString('fa-IR'),
                files: {
                    'data.json': {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            })
        });

        if (response.ok) {
            updateSyncStatus('همگام‌سازی موفق', true);
            return true;
        } else {
            throw new Error('خطا در ذخیره‌سازی');
        }
    } catch (error) {
        console.error('خطا در ذخیره‌سازی ابری:', error);
        updateSyncStatus('خطا در همگام‌سازی', false);
        saveToLocalStorage();
        return false;
    }
}

async function loadFromGist() {
    if (!gistId) return false;

    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: {
                'Authorization': `token ${githubToken}`
            }
        });

        if (response.ok) {
            const gistData = await response.json();
            const content = JSON.parse(gistData.files['data.json'].content);
            
            passengers = content.passengers || [];
            transactions = content.transactions || [];
            
            renderAllData();
            updateSyncStatus('داده‌ها بارگیری شد', true);
            return true;
        } else {
            throw new Error('خطا در بارگیری');
        }
    } catch (error) {
        console.error('خطا در بارگیری ابری:', error);
        loadFromLocalStorage();
        return false;
    }
}

async function createNewGist() {
    const data = {
        passengers: passengers,
        transactions: transactions,
        lastUpdated: new Date().toISOString(),
        appVersion: '2.0'
    };

    try {
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: 'Ms. Papli Service Management Data',
                public: false,
                files: {
                    'data.json': {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            })
        });

        if (response.ok) {
            const gistData = await response.json();
            gistId = gistData.id;
            localStorage.setItem('gistId', gistId);
            updateSyncStatus('ذخیره‌سازی ابری فعال شد', true);
            return true;
        }
    } catch (error) {
        console.error('خطا در ایجاد Gist:', error);
    }
    return false;
}

// توابع ذخیره‌سازی محلی
function saveToLocalStorage() {
    const data = {
        passengers: passengers,
        transactions: transactions,
        lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('msPapliData', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('msPapliData');
    if (savedData) {
        const data = JSON.parse(savedData);
        passengers = data.passengers || [];
        transactions = data.transactions || [];
        renderAllData();
    }
}

// تابع بروزرسانی وضعیت همگام‌سازی
function updateSyncStatus(message, online) {
    const statusElement = document.getElementById('syncStatus');
    const cloudStatus = document.getElementById('cloudStatus');
    const storageStatus = document.getElementById('storageStatus');
    
    isOnline = online;
    
    if (online) {
        statusElement.innerHTML = `<span class="status-indicator status-online"></span> ${message}`;
        cloudStatus.innerHTML = `<span class="status-indicator status-online"></span> همگام‌سازی ابری فعال`;
        storageStatus.textContent = 'ابری (GitHub Gist)';
    } else {
        statusElement.innerHTML = `<span class="status-indicator status-offline"></span> ${message}`;
        cloudStatus.innerHTML = `<span class="status-indicator status-offline"></span> همگام‌سازی ابری غیرفعال`;
        storageStatus.textContent = 'محلی';
    }
}

// توابع رندر داده‌ها
function renderAllData() {
    renderPassengers();
    renderTransactions();
    updateDashboard();
    updateCharts();
    populatePassengerSelects();
}

function renderPassengers() {
    const passengersList = document.getElementById('passengersList');
    const searchTerm = document.getElementById('searchPassenger').value.toLowerCase();
    
    passengersList.innerHTML = '';
    
    const filteredPassengers = passengers.filter(passenger => 
        passenger.name.toLowerCase().includes(searchTerm)
    );
    
    if (filteredPassengers.length === 0) {
        passengersList.innerHTML = '<div class="transaction-item">هیچ مسافری یافت نشد.</div>';
        return;
    }
    
    filteredPassengers.forEach(passenger => {
        const passengerItem = document.createElement('div');
        passengerItem.className = 'transaction-item';
        passengerItem.innerHTML = `
            <div>
                <div>${passenger.name}</div>
                <div class="badge ${getStatusBadgeClass(passenger.paymentStatus)}">${getStatusText(passenger.paymentStatus)}</div>
            </div>
            <div>${passenger.fare.toLocaleString()} تومان</div>
        `;
        
        passengerItem.addEventListener('click', () => {
            openEditPassengerModal(passenger);
        });
        
        passengersList.appendChild(passengerItem);
    });
}

function renderTransactions() {
    const transactionsList = document.getElementById('transactionsList');
    const filterTerm = document.getElementById('filterTransactions').value.toLowerCase();
    
    transactionsList.innerHTML = '';
    
    const filteredTransactions = transactions.filter(transaction => 
        transaction.description.toLowerCase().includes(filterTerm) ||
        transaction.type.toLowerCase().includes(filterTerm)
    );
    
    if (filteredTransactions.length === 0) {
        transactionsList.innerHTML = '<div class="transaction-item">هیچ تراکنشی یافت نشد.</div>';
        return;
    }
    
    // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    filteredTransactions.forEach(transaction => {
        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        
        const isIncome = transaction.type.includes('income');
        const sign = isIncome ? '+' : '-';
        const amountClass = isIncome ? 'badge-success' : 'badge-danger';
        const date = new Date(transaction.date).toLocaleDateString('fa-IR');
        
        transactionItem.innerHTML = `
            <div>
                <div>${getTransactionTypeText(transaction.type)}</div>
                <small>${date} - ${transaction.description}</small>
            </div>
            <div class="${amountClass}">${sign}${transaction.amount.toLocaleString()} تومان</div>
        `;
        
        transactionsList.appendChild(transactionItem);
    });
}

function updateDashboard() {
    // محاسبه آمار
    const today = new Date().toDateString();
    const todayIncome = transactions
        .filter(t => t.type.includes('income') && new Date(t.date).toDateString() === today)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekIncome = transactions
        .filter(t => t.type.includes('income') && new Date(t.date) >= weekAgo)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthIncome = transactions
        .filter(t => t.type.includes('income') && new Date(t.date).getMonth() === new Date().getMonth())
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalIncome = transactions
        .filter(t => t.type.includes('income'))
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
        .filter(t => !t.type.includes('income'))
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalBalance = totalIncome - totalExpenses;
    
    // به‌روزرسانی مقادیر
    document.getElementById('todayIncome').textContent = todayIncome.toLocaleString() + ' تومان';
    document.getElementById('weekIncome').textContent = weekIncome.toLocaleString() + ' تومان';
    document.getElementById('monthIncome').textContent = monthIncome.toLocaleString() + ' تومان';
    document.getElementById('totalBalance').textContent = totalBalance.toLocaleString() + ' تومان';
    
    // به‌روزرسانی لیست پرداخت‌نشدگان
    const unpaidPassengers = passengers.filter(p => p.paymentStatus === 'unpaid');
    document.getElementById('unpaidCount').textContent = unpaidPassengers.length + ' نفر';
    
    const unpaidList = document.getElementById('unpaidList');
    unpaidList.innerHTML = '';
    unpaidPassengers.forEach(passenger => {
        const item = document.createElement('div');
        item.className = 'alert-item';
        item.innerHTML = `
            <span>${passenger.name}</span>
            <span>${passenger.fare.toLocaleString()} تومان</span>
        `;
        unpaidList.appendChild(item);
    });
    
    // آخرین هزینه‌ها
    const recentExpenses = transactions
        .filter(t => !t.type.includes('income'))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    const expensesList = document.getElementById('recentExpenses');
    expensesList.innerHTML = '';
    recentExpenses.forEach(expense => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.innerHTML = `
            <div>${getTransactionTypeText(expense.type)}</div>
            <div class="badge badge-danger">-${expense.amount.toLocaleString()} تومان</div>
        `;
        expensesList.appendChild(item);
    });
}

function updateCharts() {
    // نمودار 6 ماه اخیر
    const chart = document.getElementById('incomeChart');
    chart.innerHTML = '';
    
    const months = [];
    const incomeData = [];
    const expenseData = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('fa-IR', { month: 'long' });
        months.push(monthName);
        
        const monthIncome = transactions
            .filter(t => t.type.includes('income') && 
                        new Date(t.date).getMonth() === date.getMonth() &&
                        new Date(t.date).getFullYear() === date.getFullYear())
            .reduce((sum, t) => sum + t.amount, 0);
        
        const monthExpense = transactions
            .filter(t => !t.type.includes('income') && 
                        new Date(t.date).getMonth() === date.getMonth() &&
                        new Date(t.date).getFullYear() === date.getFullYear())
            .reduce((sum, t) => sum + t.amount, 0);
        
        incomeData.push(monthIncome);
        expenseData.push(monthExpense);
    }
    
    const maxValue = Math.max(...incomeData, ...expenseData, 100000);
    
    months.forEach((month, index) => {
        const incomeBar = document.createElement('div');
        incomeBar.className = 'bar';
        incomeBar.style.height = `${(incomeData[index] / maxValue) * 100}px`;
        incomeBar.innerHTML = `<div class="bar-label">${month}</div>`;
        chart.appendChild(incomeBar);
    });
}

function populatePassengerSelects() {
    const passengerSelect = document.getElementById('transactionPassenger');
    const customerSelect = document.getElementById('selectCustomer');
    
    passengerSelect.innerHTML = '<option value="">مسافر (اختیاری)</option>';
    customerSelect.innerHTML = '<option value="">انتخاب مسافر</option>';
    
    passengers.forEach(passenger => {
        const option1 = document.createElement('option');
        option1.value = passenger.id;
        option1.textContent = passenger.name;
        passengerSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = passenger.id;
        option2.textContent = passenger.name;
        customerSelect.appendChild(option2);
    });
}

// توابع کمکی
function getStatusBadgeClass(status) {
    switch(status) {
        case 'paid': return 'badge-success';
        case 'unpaid': return 'badge-danger';
        case 'creditor': return 'badge-warning';
        default: return 'badge-danger';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'paid': return 'تسویه شده';
        case 'unpaid': return 'پرداخت نشده';
        case 'creditor': return 'بستانکار';
        default: return 'نا مشخص';
    }
}

function getTransactionTypeText(type) {
    switch(type) {
        case 'income-cash': return '💰 درآمد نقدی';
        case 'income-card': return '💳 درآمد کارتی';
        case 'fuel': return '⛽ سوخت';
        case 'repair': return '🔧 تعمیرات';
        case 'insurance': return '📑 بیمه';
        case 'car-supplies': return '🚗 لوازم خودرو';
        case 'other': return '📋 سایر';
        default: return type;
    }
}

// مدیریت مودال‌ها
function openEditPassengerModal(passenger) {
    currentEditingId = passenger.id;
    
    document.getElementById('editPassengerName').value = passenger.name;
    document.getElementById('editPassengerPhone').value = passenger.phone;
    document.getElementById('editPassengerAddress').value = passenger.address;
    document.getElementById('editPassengerSchool').value = passenger.school;
    document.getElementById('editPassengerFare').value = passenger.fare;
    document.getElementById('editPassengerPaymentType').value = passenger.paymentType;
    
    document.getElementById('editPassengerModal').style.display = 'flex';
}

function showConfirmModal(title, message, confirmCallback) {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;
    document.getElementById('confirmModal').style.display = 'flex';
    
    const confirmBtn = document.getElementById('confirmModalConfirm');
    confirmBtn.onclick = confirmCallback;
}

// مقداردهی اولیه
document.addEventListener('DOMContentLoaded', function() {
    // تنظیمات پیش‌فرض
    document.getElementById('transactionDate').valueAsDate = new Date();
    document.getElementById('fromDate').valueAsDate = new Date();
    document.getElementById('toDate').valueAsDate = new Date();
    
    // بارگیری تنظیمات
    gistId = localStorage.getItem('gistId') || '';
    githubToken = localStorage.getItem('githubToken') || ''; // خواندن توکن از localStorage
    const savedPassword = localStorage.getItem('appPassword') || '1234';
    
    document.getElementById('gistId').value = gistId;
    document.getElementById('githubToken').value = githubToken;
    
    // مدیریت ورود
    document.getElementById('loginBtn').addEventListener('click', function() {
        const password = document.getElementById('loginPassword').value;
        if (password === savedPassword) {
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            
            // بارگیری داده‌ها
            if (gistId && githubToken) {
                loadFromGist();
            } else {
                loadFromLocalStorage();
            }
        } else {
            alert('رمز ورود نادرست است!');
        }
    });
    
    // استفاده از رمز پیش‌فرض برای اولین بار
    if (!localStorage.getItem('appPassword')) {
        document.getElementById('loginPassword').value = '1234';
    }
    
    // بقیه رویدادها...
    // [کدهای کامل مدیریت مسافران، تراکنش‌ها، گزارشات و تنظیمات]
});
