// home.js - Complete script for the home page
const API_BASE_URL = 'http://localhost:8080'; // Update with your Spring Boot server URL

document.addEventListener('DOMContentLoaded', function() {
    // Get the recharge form elements
    const mobileNumberInput = document.getElementById('mobileNumber');
    const proceedBtn = document.querySelector('#rechargeForm .btn-primary');

    // Create error message span element
    const errorSpan = document.createElement('span');
    errorSpan.className = 'text-danger d-block mt-2 small';
    errorSpan.style.display = 'none';

    // Add the error span after the input
    if (mobileNumberInput) {
        // Find the parent container and append error span
        const inputContainer = mobileNumberInput.closest('.form-group') || mobileNumberInput.parentNode;
        inputContainer.appendChild(errorSpan);

        // Only allow digits in the mobile number input
        mobileNumberInput.addEventListener('input', function() {
            // Remove non-digit characters
            this.value = this.value.replace(/\D/g, '');

            // Limit to 10 digits
            if (this.value.length > 10) {
                this.value = this.value.slice(0, 10);
            }

            // Clear error message when user starts typing
            clearError();
        });
    }

    // Show error message in the span
    function showError(message) {
        errorSpan.textContent = message;
        errorSpan.style.display = 'block';
        mobileNumberInput.classList.add('border-danger');
    }

    // Clear error message
    function clearError() {
        errorSpan.style.display = 'none';
        mobileNumberInput.classList.remove('border-danger');
    }

    if (mobileNumberInput && proceedBtn) {
        // Proceed button click handler
        proceedBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            const mobile = mobileNumberInput.value.trim();

            // Clear previous errors
            clearError();

            // Basic validation
            if (!/^[6-9]\d{9}$/.test(mobile)) {
                showError('Please enter a valid mobile number');
                mobileNumberInput.focus();
                return;
            }

            // Show loading state
            proceedBtn.disabled = true;
            proceedBtn.innerHTML = 'Validating... <i class="fas fa-spinner fa-spin"></i>';

            try {
                // Verify with database
                const response = await fetch(`${API_BASE_URL}/api/auth/validate-mobile`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: mobile
                    })
                });

                const data = await response.json();

                if (response.ok && data.token) {
                    // User verified successfully

                    // Store the verified mobile number using SESSION storage
                    sessionStorage.setItem("mobileNumber", mobile);

                    // Store the token for authentication using SESSION storage
                    sessionStorage.setItem("authToken", data.token);

                    // Redirect to recharge page
                    window.location.href = 'Recharge.html';
                } else {
                    // Invalid mobile number or error
                    showError('Enter the valid MobiComm number');
                }
            } catch (error) {
                console.error('Validation error:', error);
                showError('Server Busy. Please try again.');
            } finally {
                // Restore button state
                proceedBtn.disabled = false;
                proceedBtn.innerHTML = 'Proceed to Recharge <i class="fas fa-arrow-right"></i>';
            }
        });
    }
});