document.addEventListener('DOMContentLoaded', function() {
    // Base API URL
    const BASE_URL = 'http://localhost:8080/api';

    // Get JWT token from sessionStorage instead of localStorage
    const token = sessionStorage.getItem('token');
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

    // Fetch Expiring Plans
    function fetchExpiringPlans() {
        logWithTimestamp('Fetching expiring plans...');

        fetch(`${BASE_URL}/dashboard/users-expiring-plans`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(plans => {
                const expiringPlansBody = document.getElementById('expiringPlansBody');
                const expiringPlansCount = document.getElementById('expiringPlansCount');

                // Clear existing rows
                expiringPlansBody.innerHTML = '';

                // Filter and sort plans expiring in 1-3 days
                const filteredPlans = plans
                    .filter(plan => {
                        const expiryDate = new Date(plan.expiryDate);
                        const daysRemaining = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                        return daysRemaining >= 1 && daysRemaining <= 3;
                    })
                    .sort((a, b) => {
                        const daysRemainingA = Math.ceil((new Date(a.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                        const daysRemainingB = Math.ceil((new Date(b.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                        return daysRemainingA - daysRemainingB;
                    });

                // Update expiring plans count
                expiringPlansCount.textContent = filteredPlans.length;

                // Populate expiring plans table
                filteredPlans.forEach((plan, index) => {
                    const expiryDate = new Date(plan.expiryDate);
                    const daysRemaining = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

                    const row = document.createElement('tr');
                    row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${plan.mobileNumber}</td>
                    <td>${plan.planName || 'Uncategorized'}</td>
                    <td>₹0</td>
                    <td>${expiryDate.toLocaleDateString()}</td>
                    <td class="${daysRemaining <= 2 ? 'text-danger' : 'text-warning'}">${daysRemaining} days</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-info view-history" 
                                data-mobile="${plan.mobileNumber}" 
                                data-userid="${plan.userId}">
                            <i class="bi bi-clock-history me-1"></i>History
                        </button>
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

                if (filteredPlans.length === 0) {
                    expiringPlansBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted">
                            No plans expiring within the next 1-3 days.
                        </td>
                    </tr>
                `;
                }
            })
            .catch(error => {
                console.error('Error fetching expiring plans:', error);
                const expiringPlansBody = document.getElementById('expiringPlansBody');
                expiringPlansBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Unable to load expiring plans. ${error.message}
                    </td>
                </tr>
            `;
            });
    }

    // Fetch and show user transaction history
    function showUserTransactionHistory(mobileNumber, userId) {
        logWithTimestamp(`Fetching transaction history for Mobile: ${mobileNumber}, User ID: ${userId}`);

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
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(transactions => {
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
                    <td>${amount}</td>
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

    // Refresh button event listener
    const refreshButton = document.getElementById('refreshDashboard');
    if (refreshButton) {
        refreshButton.addEventListener('click', fetchExpiringPlans);
    }

    // Initialize the dashboard
    fetchExpiringPlans();
});