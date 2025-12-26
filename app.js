// Application State
let subscriptions = [];
let editingId = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let sortColumn = null;
let sortDirection = 'asc';

// BIOS Boot Sequence
const bootSequence = [
    "Subscription Tracker System v1.0.0",
    "Initializing payment tracker...",
    "Loading subscription database...",
    "Checking recurring payments...",
    "Syncing calendar events...",
    "Loading statistics engine...",
    "Initializing notification system...",
    "Mounting storage modules...",
    "Verifying data integrity...",
    "System ready.",
    "Welcome to Subscription Tracker..."
];

let bootIndex = 0;
const bootContainer = document.getElementById('boot-sequence');

function bootSystem() {
    if (bootIndex < bootSequence.length) {
        const line = document.createElement('div');
        line.textContent = bootSequence[bootIndex];
        bootContainer.appendChild(line);
        bootIndex++;
        setTimeout(bootSystem, 150);
    } else {
        setTimeout(() => {
            document.getElementById('bios-screen').classList.remove('active');
            initializeApp();
        }, 1000);
    }
}

// Initialize Application
async function initializeApp() {
    subscriptions = await Storage.getAll();
    renderDashboard();
    renderCalendar();
    renderStatistics();
    updateStats();
    checkUpcomingPayments();
    requestNotificationPermission();
    updateClock();
    updateDateWidget();

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Update Date Widget
function updateDateWidget() {
    const now = new Date();
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    const dateStr = `${months[now.getMonth()]} ${now.getDate()}`;
    const dayStr = days[now.getDay()];

    document.getElementById('current-date').textContent = dateStr;
    document.getElementById('current-day').textContent = dayStr;
}

// Update Clock
function updateClock() {
    const clockElement = document.getElementById('clock');

    function updateTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // 0시를 12시로 표시

        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        const timeStr = `${hours}:${minutesStr} ${ampm}`;

        clockElement.textContent = timeStr;
    }

    updateTime();
    setInterval(updateTime, 1000); // 1초마다 업데이트
}

// Calculate Next Payment Date
function calculateNextPayment(subscription) {
    const startDate = new Date(subscription.nextPayment);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (subscription.period === 'monthly') {
        // Find next monthly payment
        let nextDate = new Date(today.getFullYear(), today.getMonth(), startDate.getDate());
        if (nextDate < today) {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
        return nextDate;
    }

    if (subscription.period === 'yearly') {
        // Find next yearly payment
        let nextDate = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());
        if (nextDate < today) {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        return nextDate;
    }

    if (subscription.period === 'weekly') {
        // Find next weekly payment
        const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        const weeksPassed = Math.floor(daysDiff / 7);
        const nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + (weeksPassed + 1) * 7);
        return nextDate;
    }

    return startDate;
}

// Update Statistics
function updateStats() {
    const activeSubscriptions = subscriptions.filter(sub => sub.isActive !== false);
    const total = activeSubscriptions.length;
    const monthly = activeSubscriptions.reduce((sum, sub) => {
        const price = parseFloat(sub.price);
        if (sub.period === 'yearly') return sum + (price / 12);
        if (sub.period === 'weekly') return sum + (price * 4);
        return sum + price;
    }, 0);
    const yearly = monthly * 12;
    const avg = total > 0 ? monthly / total : 0;

    document.getElementById('total-subs').textContent = total;
    document.getElementById('monthly-cost').textContent = '₩' + Math.round(monthly).toLocaleString();
    document.getElementById('yearly-cost').textContent = '₩' + Math.round(yearly).toLocaleString();
    document.getElementById('avg-cost').textContent = '₩' + Math.round(avg).toLocaleString();
}

// Render Dashboard
function renderDashboard() {
    const container = document.getElementById('subscription-items');
    if (subscriptions.length === 0) {
        container.innerHTML = '<div class="empty-state">No subscriptions found. Click "Add New" to get started.</div>';
        return;
    }

    let displaySubs = [...subscriptions];
    if (sortColumn) {
        displaySubs = sortSubscriptionsList(displaySubs);
    }

    container.innerHTML = displaySubs.map(sub => {
        const isActive = sub.isActive !== false;
        const nextPaymentDate = calculateNextPayment(sub);

        return `
        <div class="list-item ${!isActive ? 'inactive' : ''}">
            <div class="item-name">
                <div class="item-icon ${!isActive ? 'inactive' : ''}">${sub.name.charAt(0)}</div>
                ${sub.name}
            </div>
            <div class="item-category">${sub.category}</div>
            <div style="font-weight: 600; font-family: 'Space Grotesk', monospace;">₩${Math.round(parseFloat(sub.price)).toLocaleString()}</div>
            <div style="text-transform: capitalize;">${sub.period}</div>
            <div>${nextPaymentDate.toLocaleDateString()}</div>
            <div class="item-actions">
                <button class="action-btn" onclick="editSubscription('${sub.id}')" title="Edit">
                    <i data-lucide="pencil" style="width: 16px; height: 16px;"></i>
                </button>
                <button class="action-btn" onclick="deleteSubscription('${sub.id}')" title="Delete">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                </button>
            </div>
        </div>
    `}).join('');

    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Render Calendar
function renderCalendar() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    document.getElementById('calendar-month-year').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;
    
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    // Add previous month's days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.innerHTML = `<div class="calendar-day-number">${daysInPrevMonth - i}</div>`;
        grid.appendChild(day);
    }
    
    // Add current month's days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        
        // Check if today
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            day.classList.add('today');
        }
        
        // Check for subscriptions due on this day
        const dayDate = new Date(currentYear, currentMonth, i);
        const dayEvents = subscriptions.filter(sub => {
            if (sub.isActive === false) return false;

            const startDate = new Date(sub.nextPayment);
            const startDay = startDate.getDate();

            // For monthly subscriptions: check if day matches
            if (sub.period === 'monthly') {
                return startDay === i;
            }

            // For yearly subscriptions: check if both month and day match
            if (sub.period === 'yearly') {
                return startDate.getMonth() === currentMonth && startDay === i;
            }

            // For weekly subscriptions: calculate if this date falls on a payment week
            if (sub.period === 'weekly') {
                const daysDiff = Math.floor((dayDate - startDate) / (1000 * 60 * 60 * 24));
                return daysDiff >= 0 && daysDiff % 7 === 0;
            }

            return false;
        });
        
        let eventsHTML = '';
        if (dayEvents.length > 0) {
            eventsHTML = '<div class="calendar-day-events">';
            dayEvents.forEach(event => {
                eventsHTML += `<div class="calendar-event">${event.name}</div>`;
            });
            eventsHTML += '</div>';
        }
        
        day.innerHTML = `
            <div class="calendar-day-number">${i}</div>
            ${eventsHTML}
        `;
        grid.appendChild(day);
    }
    
    // Add next month's days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.innerHTML = `<div class="calendar-day-number">${i}</div>`;
        grid.appendChild(day);
    }
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Change Calendar Month
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

// Render Statistics (Original Bar Chart Style)
function renderStatistics() {
    const categoryContainer = document.getElementById('category-chart');
    const trendContainer = document.getElementById('trend-chart');
    const paymentContainer = document.getElementById('payment-chart');
    const periodContainer = document.getElementById('period-chart');

    const activeSubscriptions = subscriptions.filter(sub => sub.isActive !== false);

    if (activeSubscriptions.length === 0) {
        [categoryContainer, trendContainer, paymentContainer, periodContainer].forEach(container => {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No data available</p>';
        });
        return;
    }

    // Category Bar Chart (Original Style)
    const categoryData = {};
    activeSubscriptions.forEach(sub => {
        const price = parseFloat(sub.price);
        const monthly = sub.period === 'yearly' ? price / 12 :
                       sub.period === 'weekly' ? price * 4 : price;
        categoryData[sub.category] = (categoryData[sub.category] || 0) + monthly;
    });

    const maxValue = Math.max(...Object.values(categoryData));
    const total = Object.values(categoryData).reduce((sum, val) => sum + val, 0);

    categoryContainer.innerHTML = `
        <div style="display: flex; align-items: flex-end; gap: 4px; height: 240px; background: #E5E5E5; border: 1px solid #E5E5E5; padding: 0.5rem;">
            ${Object.entries(categoryData).map(([category, amount]) => {
                const percentage = Math.max(5, (amount / maxValue) * 100);
                const share = ((amount / total) * 100).toFixed(1);
                return `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                        <div style="position: relative; width: 100%; text-align: center; margin-bottom: 8px;">
                            <div style="font-size: 0.8rem; color: #666; margin-bottom: 4px;">
                                ${share}%
                            </div>
                            <div style="font-weight: 600; font-size: 0.9rem;">
                                ₩${Math.round(amount).toLocaleString()}
                            </div>
                        </div>
                        <div style="height: ${percentage}%; background: #000; width: 100%; transition: opacity 0.2s; min-height: 20px;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                        </div>
                        <div style="margin-top: 8px; font-size: 11px; color: #666; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; word-break: break-word;">
                            ${category}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Category Details List
    const categoryDetails = Object.entries(categoryData).sort((a, b) => b[1] - a[1]).map(([category, amount]) => {
        const count = activeSubscriptions.filter(sub => sub.category === category).length;
        const avgAmount = amount / count;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #F9FAFB; border-radius: 8px; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="font-weight: 700; font-size: 1.125rem;">${category}</div>
                    <div style="color: #666; font-size: 0.875rem;">${count} subscription${count > 1 ? 's' : ''}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; font-size: 1.125rem;">₩${Math.round(amount).toLocaleString()}/mo</div>
                    <div style="color: #666; font-size: 0.875rem;">Avg: ₩${Math.round(avgAmount).toLocaleString()}</div>
                </div>
            </div>
        `;
    }).join('');
    trendContainer.innerHTML = categoryDetails;

    // Payment Period Distribution
    const periodData = {};
    activeSubscriptions.forEach(sub => {
        periodData[sub.period] = (periodData[sub.period] || 0) + 1;
    });

    const periodTotal = Object.values(periodData).reduce((sum, val) => sum + val, 0);
    const periodBars = Object.entries(periodData).map(([period, count]) => {
        const percentage = ((count / periodTotal) * 100).toFixed(1);
        return `
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="font-weight: 600; text-transform: capitalize;">${period}</span>
                    <span style="color: #666;">${count} (${percentage}%)</span>
                </div>
                <div style="background: #E5E5E5; height: 32px; border-radius: 4px; overflow: hidden;">
                    <div style="background: #000; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                </div>
            </div>
        `;
    }).join('');
    paymentContainer.innerHTML = periodBars;

    // Top 5 Most Expensive Subscriptions
    const topSubs = [...activeSubscriptions]
        .sort((a, b) => {
            const aMonthly = a.period === 'yearly' ? parseFloat(a.price) / 12 : 
                           a.period === 'weekly' ? parseFloat(a.price) * 4 : parseFloat(a.price);
            const bMonthly = b.period === 'yearly' ? parseFloat(b.price) / 12 : 
                           b.period === 'weekly' ? parseFloat(b.price) * 4 : parseFloat(b.price);
            return bMonthly - aMonthly;
        })
        .slice(0, 5);

    const topSubsList = topSubs.map((sub, index) => {
        const monthly = sub.period === 'yearly' ? parseFloat(sub.price) / 12 : 
                       sub.period === 'weekly' ? parseFloat(sub.price) * 4 : parseFloat(sub.price);
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: ${index === 0 ? '#FFF9E6' : '#F9FAFB'}; border-radius: 8px; margin-bottom: 0.5rem; border: ${index === 0 ? '2px solid #FFD700' : '1px solid #E5E5E5'};">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${index === 0 ? '#FFD700' : '#666'}; width: 32px;">${index + 1}</div>
                    <div>
                        <div style="font-weight: 700; font-size: 1rem;">${sub.name}</div>
                        <div style="color: #666; font-size: 0.875rem;">${sub.category} • ${sub.period}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; font-size: 1.25rem;">₩${Math.round(monthly).toLocaleString()}/mo</div>
                    <div style="color: #666; font-size: 0.875rem;">₩${Math.round(monthly * 12).toLocaleString()}/year</div>
                </div>
            </div>
        `;
    }).join('');
    periodContainer.innerHTML = topSubsList;
}

// Tab Switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');

    // Re-render if needed
    if (tabName === 'calendar') {
        renderCalendar();
    } else if (tabName === 'statistics') {
        renderStatistics();
    }

    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Modal Functions
function openModal() {
    editingId = null;
    document.getElementById('subscription-form').reset();
    document.querySelector('.modal-title').textContent = 'Add New Subscription';
    document.querySelector('.btn-primary').textContent = 'Add Subscription';

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('next-payment').value = today;

    // Reset active status
    document.getElementById('is-active').checked = true;

    document.getElementById('subscription-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('subscription-modal').classList.remove('active');
    editingId = null;
}

async function saveSubscription() {
    const name = document.getElementById('service-name').value;
    const price = document.getElementById('price').value;
    const period = document.getElementById('period').value;
    const category = document.getElementById('category').value;
    const nextPayment = document.getElementById('next-payment').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const isActive = document.getElementById('is-active').checked;
    const notes = document.getElementById('notes').value;

    if (!name || !price || !category || !nextPayment) {
        alert('Please fill in all required fields');
        return;
    }

    const subscription = {
        name,
        price,
        period,
        category,
        nextPayment,
        paymentMethod,
        isActive,
        notes
    };

    if (editingId) {
        await Storage.update(editingId, subscription);
    } else {
        await Storage.add(subscription);
    }

    subscriptions = await Storage.getAll();
    renderDashboard();
    renderCalendar();
    renderStatistics();
    updateStats();
    closeModal();
}

async function editSubscription(id) {
    const sub = await Storage.getById(id);
    if (!sub) return;

    editingId = id;
    document.getElementById('service-name').value = sub.name;
    document.getElementById('price').value = sub.price;
    document.getElementById('period').value = sub.period;
    document.getElementById('category').value = sub.category;
    document.getElementById('next-payment').value = sub.nextPayment;
    document.getElementById('payment-method').value = sub.paymentMethod || '';
    document.getElementById('is-active').checked = sub.isActive !== false;
    document.getElementById('notes').value = sub.notes || '';

    document.querySelector('.modal-title').textContent = 'Edit Subscription';
    document.querySelector('.btn-primary').textContent = 'Save Changes';
    document.getElementById('subscription-modal').classList.add('active');
}

async function deleteSubscription(id) {
    if (confirm('Are you sure you want to delete this subscription?')) {
        await Storage.delete(id);
        subscriptions = await Storage.getAll();
        renderDashboard();
        renderCalendar();
        renderStatistics();
        updateStats();
    }
}

// Window Management
function openWindow(type) {
    if (type === 'tracker') {
        document.getElementById('tracker-window').classList.add('active');
    } else if (type === 'about') {
        document.getElementById('about-window').classList.add('active');
    }

    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function openWindowWithTab(tabName) {
    // Open the tracker window
    document.getElementById('tracker-window').classList.add('active');

    // Switch to the specified tab
    switchTab(tabName);

    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function closeWindow(type) {
    if (type === 'tracker') {
        document.getElementById('tracker-window').classList.remove('active');
    } else if (type === 'about') {
        document.getElementById('about-window').classList.remove('active');
    }
}

// Window Dragging
let draggedWindow = null;
let offsetX = 0;
let offsetY = 0;

function startDrag(e, windowId) {
    draggedWindow = document.getElementById(windowId);
    const rect = draggedWindow.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
}

function drag(e) {
    if (draggedWindow) {
        draggedWindow.style.left = (e.clientX - offsetX) + 'px';
        draggedWindow.style.top = (e.clientY - offsetY) + 'px';
        draggedWindow.style.transform = 'none';
    }
}

function stopDrag() {
    draggedWindow = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

// Sorting Functions
function sortSubscriptions(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    renderDashboard();
}

function sortSubscriptionsList(subs) {
    return subs.sort((a, b) => {
        let aVal, bVal;

        switch(sortColumn) {
            case 'name':
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
                break;
            case 'price':
                aVal = parseFloat(a.price);
                bVal = parseFloat(b.price);
                break;
            case 'date':
                aVal = new Date(a.nextPayment);
                bVal = new Date(b.nextPayment);
                break;
            default:
                return 0;
        }

        if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });
}

// Notification Functions
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function checkUpcomingPayments() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeSubscriptions = subscriptions.filter(sub => sub.isActive !== false);

    activeSubscriptions.forEach(sub => {
        const paymentDate = calculateNextPayment(sub);
        paymentDate.setHours(0, 0, 0, 0);

        const daysUntil = Math.ceil((paymentDate - today) / (1000 * 60 * 60 * 24));

        // Notify for payments in 3 days, 1 day, or today
        if (daysUntil === 3 || daysUntil === 1 || daysUntil === 0) {
            sendNotification(sub, daysUntil);
        }
    });

    // Check again every hour
    setTimeout(checkUpcomingPayments, 60 * 60 * 1000);
}

function sendNotification(subscription, daysUntil) {
    if ('Notification' in window && Notification.permission === 'granted') {
        let message;
        const price = Math.round(parseFloat(subscription.price)).toLocaleString();
        if (daysUntil === 0) {
            message = `Payment due TODAY for ${subscription.name} - ₩${price}`;
        } else if (daysUntil === 1) {
            message = `Payment due TOMORROW for ${subscription.name} - ₩${price}`;
        } else {
            message = `Payment due in ${daysUntil} days for ${subscription.name} - ₩${price}`;
        }

        new Notification('Subscription Payment Reminder', {
            body: message,
            icon: 'https://via.placeholder.com/128?text=💰'
        });
    }
}

// Export Data to JSON
async function exportData() {
    const data = await Storage.getAll();
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Data exported successfully!');
}

// Import Data from JSON
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Validate data structure
            if (!Array.isArray(data)) {
                alert('Invalid data format. Expected an array of subscriptions.');
                return;
            }

            // Confirm before importing
            if (confirm(`This will replace your current data with ${data.length} subscription(s). Continue?`)) {
                await Storage.saveAll(data);
                subscriptions = await Storage.getAll();
                renderDashboard();
                renderCalendar();
                renderStatistics();
                updateStats();
                alert('Data imported successfully!');
            }
        } catch (error) {
            alert('Error reading file. Please make sure it\'s a valid JSON file.');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
}

// Start boot sequence on page load
window.addEventListener('DOMContentLoaded', bootSystem);
