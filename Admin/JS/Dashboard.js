document.addEventListener('DOMContentLoaded', function() {
    // Base API URL
    const BASE_URL = 'http://localhost:8080/api';

    // Get JWT token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    // Enhanced logging function
    function logWithTimestamp(message, data = null) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
        if (data) console.log(data);
    }

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('sidebar-mobile');
        });
    }

    // Reminder Variables
    let selectedUsers = [];
    let reminderTemplates = {
        1: {
            subject: "Your Mobi Comm Plan is Expiring Soon",
            content: `Dear customer,

Your mobile plan will expire soon. To ensure uninterrupted service, please renew your plan before the expiry date.

Plan: {planName}
Expiry Date: {expiryDate}
Days Remaining: {daysRemaining}

Renew now at: https://mobicomm.com/renew

Thank you for choosing Mobi Comm.`
        },
        2: {
            subject: "Special Offer: Renew Your Plan Now!",
            content: `Dear customer,

Your mobile plan is about to expire. Renew now and get 10% OFF on your next recharge!

Plan Details:
- Current Plan: {planName}
- Expiry Date: {expiryDate}
- Days Remaining: {daysRemaining}

Use code RENEW10 during checkout.
Offer valid until: {offerDate}

Visit: https://mobicomm.com/renew

Mobi Comm - Stay Connected!`
        },
        3: {
            subject: "URGENT: Your Plan Expires Soon!",
            content: `URGENT NOTICE

Your Mobi Comm plan is about to expire in {daysRemaining} days!

Plan: {planName}
Expiry: {expiryDate}

To avoid service interruption, please renew immediately.
https://mobicomm.com/renew

Need help? Call our support at 1800-123-4567.

- Mobi Comm Team`
        }
    };

    // Fetch Dashboard Statistics with fallback for errors
    function fetchDashboardStats() {
        logWithTimestamp('Fetching dashboard statistics...');

        fetch(`${BASE_URL}/dashboard/statistics`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    // If we get an error, use default values instead of throwing
                    console.warn(`Statistics API returned status: ${response.status}`);
                    return {
                        totalRevenue: 0,
                        totalTransactions: 0,
                        successfulTransactions: 0,
                        failedTransactions: 0,
                        popularPlan: 'N/A'
                    };
                }
                return response.json();
            })
            .then(stats => {
                logWithTimestamp('Dashboard stats received:', stats);

                // Format totalRevenue with commas and 2 decimal places
                const formattedRevenue = stats.totalRevenue?.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2
                }) || '0.00';

                // Update dashboard cards with fallbacks for missing values
                document.getElementById('totalRevenue').textContent = `₹${formattedRevenue}`;
                document.getElementById('totalTransactions').textContent = stats.totalTransactions || 0;

                // Calculate success rate with fallback
                const totalTxn = stats.totalTransactions || 0;
                const successfulTxn = stats.successfulTransactions || 0;
                const successRate = totalTxn > 0
                    ? ((successfulTxn / totalTxn) * 100).toFixed(1)
                    : 0;
                document.getElementById('successRate').textContent = `${successRate}%`;

                // Popular plan with fallback
                document.getElementById('popularPlan').textContent = stats.popularPlan || 'N/A';
            })
            .catch(error => {
                console.error('Error fetching dashboard stats:', error);

                // Set default values on error
                document.getElementById('totalRevenue').textContent = '₹0.00';
                document.getElementById('totalTransactions').textContent = '0';
                document.getElementById('successRate').textContent = '0%';
                document.getElementById('popularPlan').textContent = 'N/A';
            });
    }

    // Enhanced Fetch Expiring Plans Function with Reminder UI
    function fetchExpiringPlans() {
        logWithTimestamp('Fetching expiring plans...');

        fetch(`${BASE_URL}/dashboard/expiring-plans`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                logWithTimestamp('Response Status:', response.status);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(plans => {
                logWithTimestamp('Expiring Plans Received:', plans.length);

                const expiringPlansBody = document.getElementById('expiringPlansBody');
                const expiringPlansCount = document.getElementById('expiringPlansCount');

                // Clear existing rows
                expiringPlansBody.innerHTML = '';

                // Reset selected users
                selectedUsers = [];
                updateSelectedCount();

                // Update expiring plans count
                expiringPlansCount.textContent = plans.length;

                // Debug: Log all received plans
                console.log('Received Plans:', plans);

                // Filter for plans expiring in 1-3 days
                let expiringInOneToThreeDays = [];

                plans.forEach(plan => {
                    // Enhanced error handling and default values
                    const mobileNumber = plan.mobileNumber || 'N/A';
                    const planName = plan.planName || 'Unknown Plan';
                    const expiryDate = plan.expiryDate ? new Date(plan.expiryDate) : new Date();
                    const userId = plan.userId || 0;

                    // Calculate days remaining
                    const today = new Date();
                    const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                    // Only consider plans expiring in 1-3 days
                    if (daysRemaining <= 3 && daysRemaining >= 1) {
                        expiringInOneToThreeDays.push({
                            mobileNumber,
                            planName,
                            expiryDate,
                            userId,
                            daysRemaining,
                            reminderSent: Math.random() > 0.7 // Random for demo purposes
                        });
                    }
                });

                // Sort by days remaining (ascending) so most urgent appears first
                expiringInOneToThreeDays.sort((a, b) => a.daysRemaining - b.daysRemaining);

                // Update count to show filtered results
                expiringPlansCount.textContent = expiringInOneToThreeDays.length;

                // Populate expiring plans table
                expiringInOneToThreeDays.forEach(plan => {
                    // Detailed logging for each plan
                    logWithTimestamp(`Plan Details: 
                Mobile: ${plan.mobileNumber}, 
                Plan: ${plan.planName}, 
                Expiry: ${plan.expiryDate}, 
                Days Remaining: ${plan.daysRemaining}`);

                    // Create row with appropriate color coding based on days remaining
                    const row = document.createElement('tr');

                    // Add a class for styling based on urgency
                    if (plan.daysRemaining === 1) {
                        row.classList.add('table-danger');
                    } else if (plan.daysRemaining === 2) {
                        row.classList.add('table-warning');
                    } else {
                        row.classList.add('table-info');
                    }

                    row.innerHTML = `
                    <td>
                        <div class="form-check">
                            <input class="form-check-input user-select-checkbox" type="checkbox" 
                                id="user-${plan.userId}" 
                                data-userid="${plan.userId}" 
                                data-mobile="${plan.mobileNumber}"
                                data-planname="${plan.planName}"
                                data-expirydate="${plan.expiryDate.toLocaleDateString()}"
                                data-daysremaining="${plan.daysRemaining}"
                                ${plan.reminderSent ? 'disabled' : ''}>
                        </div>
                    </td>
                    <td>${plan.mobileNumber}</td>
                    <td>${plan.planName}</td>
                    <td>${plan.expiryDate.toLocaleDateString()}</td>
                    <td class="${plan.daysRemaining === 1 ? 'days-danger' : 'days-warning'}">${plan.daysRemaining} days</td>
                    <td class="text-center">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-info view-history" data-mobile="${plan.mobileNumber}" data-userid="${plan.userId}">
                                <i class="bi bi-clock-history me-1"></i>History
                            </button>
                            <button class="btn btn-sm ${plan.reminderSent ? 'btn-success disabled' : 'btn-outline-primary'} send-reminder" data-userid="${plan.userId}" ${plan.reminderSent ? 'disabled' : ''}>
                                <i class="bi bi-${plan.reminderSent ? 'check-circle' : 'bell'} me-1"></i>${plan.reminderSent ? 'Sent' : 'Remind'}
                            </button>
                        </div>
                    </td>
                `;

                    expiringPlansBody.appendChild(row);
                });

                // Add event listeners to history buttons
                document.querySelectorAll('.view-history').forEach(button => {
                    button.addEventListener('click', function() {
                        const mobileNumber = this.getAttribute('data-mobile');
                        const userId = this.getAttribute('data-userid');
                        showUserTransactionHistory(mobileNumber, userId);
                    });
                });

                // Add event listeners to reminder buttons
                document.querySelectorAll('.send-reminder').forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = this.getAttribute('data-userid');
                        sendReminder(userId);
                    });
                });

                // Add event listeners to checkboxes
                document.querySelectorAll('.user-select-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', function() {
                        const userId = this.getAttribute('data-userid');
                        const isChecked = this.checked;

                        if (isChecked) {
                            selectedUsers.push({
                                userId: userId,
                                mobileNumber: this.getAttribute('data-mobile'),
                                planName: this.getAttribute('data-planname'),
                                expiryDate: this.getAttribute('data-expirydate'),
                                daysRemaining: this.getAttribute('data-daysremaining')
                            });
                        } else {
                            selectedUsers = selectedUsers.filter(user => user.userId !== userId);
                        }

                        updateSelectedCount();
                    });
                });

                // If no plans, show a message
                if (expiringInOneToThreeDays.length === 0) {
                    expiringPlansBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted">
                            No plans expiring within the next 1-3 days.
                        </td>
                    </tr>
                `;
                }

                // Update the reminders sent count (for demo purposes)
                const sentCount = Math.floor(Math.random() * 12);
                document.getElementById('remindersSent').textContent = `${sentCount} sent today`;
            })
            .catch(error => {
                console.error('Detailed Expiring Plans Error:', error);

                // Display user-friendly error message
                const expiringPlansBody = document.getElementById('expiringPlansBody');
                expiringPlansBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        Unable to load expiring plans. ${error.message}
                    </td>
                </tr>
            `;
            });
    }

    // Update selected count display and button state
    function updateSelectedCount() {
        const selectedCount = document.getElementById('selectedCount');
        const sendSelectedButton = document.getElementById('sendSelectedReminders');

        selectedCount.textContent = `${selectedUsers.length} users selected`;

        if (selectedUsers.length > 0) {
            sendSelectedButton.removeAttribute('disabled');
        } else {
            sendSelectedButton.setAttribute('disabled', 'disabled');
        }
    }

    // Send reminder function
    function sendReminder(userId) {
        // In a real application, this would call your backend API
        logWithTimestamp(`Sending reminder to user ID: ${userId}`);

        // Find the button and update its appearance to simulate sending
        const button = document.querySelector(`.send-reminder[data-userid="${userId}"]`);
        if (button) {
            button.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Sending...';
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-warning');
            button.setAttribute('disabled', 'disabled');

            // Simulate API call delay
            setTimeout(() => {
                button.innerHTML = '<i class="bi bi-check-circle me-1"></i>Sent';
                button.classList.remove('btn-warning');
                button.classList.add('btn-success');

                // Disable the checkbox too
                const checkbox = document.querySelector(`.user-select-checkbox[data-userid="${userId}"]`);
                if (checkbox) {
                    checkbox.checked = false;
                    checkbox.setAttribute('disabled', 'disabled');

                    // Remove from selected users if it was selected
                    selectedUsers = selectedUsers.filter(user => user.userId !== userId);
                    updateSelectedCount();
                }

                // Update the sent count
                const remindersSent = document.getElementById('remindersSent');
                const currentCount = parseInt(remindersSent.textContent) || 0;
                remindersSent.textContent = `${currentCount + 1} sent today`;
            }, 1500);
        }
    }

    // Send reminders to all selected users
    function sendSelectedReminders() {
        if (selectedUsers.length === 0) return;

        logWithTimestamp(`Sending reminders to ${selectedUsers.length} users`);

        // Show reminder sent modal
        const reminderSentModal = new bootstrap.Modal(document.getElementById('reminderSentModal'));
        document.getElementById('reminderSentCount').textContent =
            `${selectedUsers.length} reminder${selectedUsers.length > 1 ? 's' : ''} successfully sent.`;

        // Disable all selected checkboxes and update buttons
        selectedUsers.forEach(user => {
            const userId = user.userId;

            // Update button
            const button = document.querySelector(`.send-reminder[data-userid="${userId}"]`);
            if (button) {
                button.innerHTML = '<i class="bi bi-check-circle me-1"></i>Sent';
                button.classList.remove('btn-outline-primary');
                button.classList.add('btn-success');
                button.setAttribute('disabled', 'disabled');
            }

            // Disable checkbox
            const checkbox = document.querySelector(`.user-select-checkbox[data-userid="${userId}"]`);
            if (checkbox) {
                checkbox.checked = false;
                checkbox.setAttribute('disabled', 'disabled');
            }
        });

        // Update the sent count
        const remindersSent = document.getElementById('remindersSent');
        const currentCount = parseInt(remindersSent.textContent) || 0;
        remindersSent.textContent = `${currentCount + selectedUsers.length} sent today`;

        // Clear selected users
        selectedUsers = [];
        updateSelectedCount();

        // Show confirmation modal after a slight delay
        setTimeout(() => {
            reminderSentModal.show();
        }, 500);
    }

    // Fetch and show user transaction history
    function showUserTransactionHistory(mobileNumber, userId) {
        logWithTimestamp(`Fetching history for Mobile: ${mobileNumber}, User ID: ${userId}`);

        // Set mobile number in modal
        document.getElementById('modalUserMobile').textContent = mobileNumber;

        // Show loading indicator
        const historyBody = document.getElementById('userTransactionHistoryBody');
        historyBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('userTransactionModal'));
        modal.show();

        // Fetch transaction history
        fetch(`${BASE_URL}/dashboard/user-transactions/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(transactions => {
                logWithTimestamp(`Received ${transactions.length} transactions for user ${userId}`);

                document.getElementById('modalUserTransactionCount').textContent = transactions.length;

                // Clear loading indicator
                historyBody.innerHTML = '';

                // Populate transaction history table
                transactions.forEach(transaction => {
                    const transactionDate = transaction.transactionDate ? new Date(transaction.transactionDate) : new Date();
                    const planName = transaction.planName || 'Unknown Plan';
                    const amount = transaction.amount?.toLocaleString('en-IN', {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2
                    }) || '0.00';

                    const row = document.createElement('tr');
                    row.innerHTML = `
                    <td>${transaction.transactionId}</td>
                    <td>${planName}</td>
                    <td>₹${amount}</td>
                    <td>${transactionDate.toLocaleString()}</td>
                    <td>
                        <span class="badge ${getStatusBadgeClass(transaction.paymentStatus)}">
                            ${transaction.paymentStatus}
                        </span>
                    </td>
                `;

                    historyBody.appendChild(row);
                });

                // If no transactions, show a message
                if (transactions.length === 0) {
                    historyBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted">
                            No transaction history found for this user.
                        </td>
                    </tr>
                `;
                }
            })
            .catch(error => {
                console.error('Error fetching user transaction history:', error);

                // Show error in modal
                historyBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Unable to load transaction history. ${error.message}
                    </td>
                </tr>
            `;
            });
    }

    // Preview reminder template
    function previewReminderTemplate() {
        const templateId = document.getElementById('reminderTemplate').value;
        const template = reminderTemplates[templateId];

        if (template) {
            document.getElementById('reminderSubject').value = template.subject;
            document.getElementById('reminderContent').value = template.content;

            const reminderPreviewModal = new bootstrap.Modal(document.getElementById('reminderPreviewModal'));
            reminderPreviewModal.show();
        }
    }

    // Save reminder template
    function saveReminderTemplate() {
        const templateId = document.getElementById('reminderTemplate').value;
        const subject = document.getElementById('reminderSubject').value;
        const content = document.getElementById('reminderContent').value;

        reminderTemplates[templateId] = {
            subject: subject,
            content: content
        };

        // Close the modal
        bootstrap.Modal.getInstance(document.getElementById('reminderPreviewModal')).hide();

        // Show confirmation toast or message
        alert('Template saved successfully!');
    }

    // Helper function to determine badge class based on status
    function getStatusBadgeClass(status) {
        if (!status) return 'bg-secondary';

        status = status.toLowerCase();
        if (status.includes('success') || status.includes('complete')) {
            return 'bg-success';
        } else if (status.includes('fail') || status.includes('error')) {
            return 'bg-danger';
        } else if (status.includes('pending')) {
            return 'bg-warning';
        } else {
            return 'bg-secondary';
        }
    }

    // System Information Logging
    function displaySystemInfo() {
        console.group('System Information');
        console.log('User Token:', token ? 'Present' : 'Missing');
        console.log('Current Timestamp:', new Date().toISOString());
        console.log('Base API URL:', BASE_URL);
        console.groupEnd();
    }

    // Dashboard Initialization
    function initializeDashboard() {
        displaySystemInfo();
        fetchDashboardStats();
        fetchExpiringPlans();
    }

    // Initialize event listeners for reminder features
    function initializeEventListeners() {
        // Make showUserTransactionHistory globally available
        window.showUserTransactionHistory = showUserTransactionHistory;

        // Send Selected Reminders button
        const sendSelectedButton = document.getElementById('sendSelectedReminders');
        if (sendSelectedButton) {
            sendSelectedButton.addEventListener('click', sendSelectedReminders);
        }

        // Send All Reminders button
        const sendAllButton = document.getElementById('sendAllReminders');
        if (sendAllButton) {
            sendAllButton.addEventListener('click', function() {
                // Select all checkboxes that aren't disabled
                document.querySelectorAll('.user-select-checkbox:not([disabled])').forEach(checkbox => {
                    checkbox.checked = true;

                    // Trigger the change event manually
                    const event = new Event('change');
                    checkbox.dispatchEvent(event);
                });

                // Send reminders to all selected users
                if (selectedUsers.length > 0) {
                    sendSelectedReminders();
                }
            });
        }

        // Preview Template button
        const previewTemplateButton = document.getElementById('previewTemplate');
        if (previewTemplateButton) {
            previewTemplateButton.addEventListener('click', previewReminderTemplate);
        }

        // Save Template button
        const saveTemplateButton = document.getElementById('saveTemplate');
        if (saveTemplateButton) {
            saveTemplateButton.addEventListener('click', saveReminderTemplate);
        }

        // Select All Users checkbox
        const selectAllCheckbox = document.getElementById('selectAllUsers');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const isChecked = this.checked;

                // Select/deselect all checkboxes that aren't disabled
                document.querySelectorAll('.user-select-checkbox:not([disabled])').forEach(checkbox => {
                    checkbox.checked = isChecked;

                    // Trigger the change event manually
                    const event = new Event('change');
                    checkbox.dispatchEvent(event);
                });
            });
        }

        // Auto-Reminders Toggle switch
        const autoRemindersToggle = document.getElementById('autoRemindersToggle');
        if (autoRemindersToggle) {
            autoRemindersToggle.addEventListener('change', function() {
                // This would interact with your backend to enable/disable auto-reminders
                logWithTimestamp(`Auto-reminders toggled: ${this.checked}`);
            });
        }

        // Refresh Dashboard button
        const refreshButton = document.getElementById('refreshDashboard');
        if (refreshButton) {
            refreshButton.addEventListener('click', initializeDashboard);
        }
    }

    // Initialize the dashboard
    initializeDashboard();
    initializeEventListeners();
});

// Send reminder function for a single user
function sendReminder(userId) {
    logWithTimestamp(`Sending reminder to user ID: ${userId}`);

    // Find the button and update its appearance to show sending status
    const button = document.querySelector(`.send-reminder[data-userid="${userId}"]`);
    if (button) {
        button.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Sending...';
        button.classList.remove('btn-outline-primary');
        button.classList.add('btn-warning');
        button.setAttribute('disabled', 'disabled');

        // Make the API call to your backend
        fetch(`${BASE_URL}/email/send-reminder`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                // You could include any other necessary data here
                // such as email template preference
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // On success, update UI to show sent status
                button.innerHTML = '<i class="bi bi-check-circle me-1"></i>Sent';
                button.classList.remove('btn-warning');
                button.classList.add('btn-success');

                // Disable the checkbox too
                const checkbox = document.querySelector(`.user-select-checkbox[data-userid="${userId}"]`);
                if (checkbox) {
                    checkbox.checked = false;
                    checkbox.setAttribute('disabled', 'disabled');

                    // Remove from selected users if it was selected
                    selectedUsers = selectedUsers.filter(user => user.userId !== userId);
                    updateSelectedCount();
                }

                // Update the sent count
                const remindersSent = document.getElementById('remindersSent');
                const currentCount = parseInt(remindersSent.textContent) || 0;
                remindersSent.textContent = `${currentCount + 1} sent today`;
            })
            .catch(error => {
                console.error('Error sending reminder:', error);
                // On error, revert button to original state
                button.innerHTML = '<i class="bi bi-bell me-1"></i>Remind';
                button.classList.remove('btn-warning');
                button.classList.add('btn-outline-primary');
                button.removeAttribute('disabled');

                // Show error message to user
                alert(`Failed to send reminder: ${error.message}`);
            });
    }
}

// Send reminders to all selected users
function sendSelectedReminders() {
    if (selectedUsers.length === 0) return;

    logWithTimestamp(`Sending reminders to ${selectedUsers.length} users`);

    // Prepare the data for the API call
    const userIds = selectedUsers.map(user => user.userId);

    // Make the API call to your backend
    fetch(`${BASE_URL}/email/send-bulk-reminders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userIds: userIds,
            // You could include template preference here
            templateType: document.getElementById('reminderTemplate')?.value || 1
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Show success message
            const reminderSentModal = new bootstrap.Modal(document.getElementById('reminderSentModal'));
            document.getElementById('reminderSentCount').textContent =
                `${selectedUsers.length} reminder${selectedUsers.length > 1 ? 's' : ''} successfully sent.`;

            // Update the UI for all selected users
            selectedUsers.forEach(user => {
                const userId = user.userId;

                // Update button
                const button = document.querySelector(`.send-reminder[data-userid="${userId}"]`);
                if (button) {
                    button.innerHTML = '<i class="bi bi-check-circle me-1"></i>Sent';
                    button.classList.remove('btn-outline-primary');
                    button.classList.add('btn-success');
                    button.setAttribute('disabled', 'disabled');
                }

                // Disable checkbox
                const checkbox = document.querySelector(`.user-select-checkbox[data-userid="${userId}"]`);
                if (checkbox) {
                    checkbox.checked = false;
                    checkbox.setAttribute('disabled', 'disabled');
                }
            });

            // Update the sent count
            const remindersSent = document.getElementById('remindersSent');
            const currentCount = parseInt(remindersSent.textContent) || 0;
            remindersSent.textContent = `${currentCount + selectedUsers.length} sent today`;

            // Clear selected users
            selectedUsers = [];
            updateSelectedCount();

            // Show confirmation modal
            reminderSentModal.show();
        })
        .catch(error => {
            console.error('Error sending bulk reminders:', error);
            alert(`Failed to send reminders: ${error.message}`);
        });
}

function testEmailSending() {
    const testEmail = document.getElementById('testEmailInput').value;
    if (!testEmail) {
        alert('Please enter an email address');
        return;
    }

    // Show loading state
    const testButton = document.getElementById('testEmailButton');
    const originalText = testButton.innerHTML;
    testButton.innerHTML = 'Sending...';
    testButton.disabled = true;

    // Call the test endpoint
    fetch(`${BASE_URL}/email/test-email?email=${encodeURIComponent(testEmail)}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Test email sent successfully! Check your inbox.');
            } else {
                alert('Failed to send test email: ' + data.message);
            }
        })
        .catch(error => {
            alert('Error testing email: ' + error.message);
        })
        .finally(() => {
            // Restore button state
            testButton.innerHTML = originalText;
            testButton.disabled = false;
        });
}