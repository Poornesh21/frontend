// payment.js - With email field below mobile number
const API_BASE_URL = 'http://localhost:8080'; // Match the same base URL used in recharge.js

document.addEventListener('DOMContentLoaded', function() {
    // Apply UI enhancements first
    applyUIEnhancements();

    // Get data from sessionStorage
    const mobileNumber = sessionStorage.getItem('mobileNumber');
    const planId = sessionStorage.getItem('planId');
    const price = sessionStorage.getItem('price');
    const data = sessionStorage.getItem('data');
    const validity = sessionStorage.getItem('validity');
    const calls = sessionStorage.getItem('calls');
    const sms = sessionStorage.getItem('sms');
    const ottBenefits = sessionStorage.getItem('ottBenefits');
    const planName = sessionStorage.getItem('planName') || 'Data Plan';
    const userEmail = sessionStorage.getItem('userEmail'); // Get stored email if available

    // Log the raw data from sessionStorage for debugging
    console.log("Raw data from sessionStorage:", {
        mobileNumber, planId, price, data, validity, calls, sms, ottBenefits, planName, userEmail
    });

    // Format mobile number with proper spacing
    function formatMobileNumber(number) {
        if (!number) return '';
        // Format as +91 98765 43210
        return `+91 ${number.substring(0, 5)} ${number.substring(5)}`;
    }

    // Display mobile number and email input field
    displayMobileAndEmail(mobileNumber, userEmail);

    // Also update the mobile number in success modal for consistency
    const mobileNumberDisplay = document.getElementById('mobileNumberDisplay');
    if (mobileNumberDisplay && mobileNumber) {
        mobileNumberDisplay.textContent = formatMobileNumber(mobileNumber);
    }

    // Update order features based on selected plan
    const orderFeatures = document.querySelector('.order-features');
    if (orderFeatures && price) {
        // Clear existing features
        orderFeatures.innerHTML = '';

        // Add data feature if available
        if (data) {
            const dataFeature = document.createElement('div');
            dataFeature.className = 'order-feature';
            dataFeature.innerHTML = `
                <i class="fas fa-database feature-icon"></i>
                <span>${data}</span>
            `;
            orderFeatures.appendChild(dataFeature);
        }

        // Add validity feature if available
        if (validity) {
            const validityFeature = document.createElement('div');
            validityFeature.className = 'order-feature';
            validityFeature.innerHTML = `
                <i class="fas fa-calendar-alt feature-icon"></i>
                <span>${validity}</span>
            `;
            orderFeatures.appendChild(validityFeature);
        }

        // Add calls feature
        const callsFeature = document.createElement('div');
        callsFeature.className = 'order-feature';
        callsFeature.innerHTML = `
            <i class="fas fa-phone feature-icon"></i>
            <span>${calls || 'Unlimited calls'}</span>
        `;
        orderFeatures.appendChild(callsFeature);

        // Add SMS feature if available
        if (sms) {
            const smsFeature = document.createElement('div');
            smsFeature.className = 'order-feature';
            smsFeature.innerHTML = `
                <i class="fas fa-sms feature-icon"></i>
                <span>${sms}</span>
            `;
            orderFeatures.appendChild(smsFeature);
        }

        // Add OTT benefits if available
        if (ottBenefits && ottBenefits !== 'N/A') {
            const ottFeature = document.createElement('div');
            ottFeature.className = 'order-feature';
            ottFeature.innerHTML = `
                <i class="fas fa-film feature-icon"></i>
                <span>${ottBenefits}</span>
            `;
            orderFeatures.appendChild(ottFeature);
        }
    }

    // Update price in the cost breakdown section
    const planPriceElement = document.querySelector('.cost-breakdown .cost-value');
    const totalValueElement = document.querySelector('.cost-breakdown .total-value');
    const payButtonElement = document.querySelector('#payButton');

    if (planPriceElement && price) {
        planPriceElement.textContent = `₹${price}.00`;
    }

    if (totalValueElement && price) {
        totalValueElement.textContent = `₹${price}.00`;
    }

    if (payButtonElement && price) {
        payButtonElement.textContent = `Pay ₹${price}.00 `;
        // Add lock icon back
        const lockIcon = document.createElement('i');
        lockIcon.className = 'fas fa-lock';
        payButtonElement.appendChild(lockIcon);
    }

    // Handle back button - securely go back without URL parameters
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', function() {
            // Go back to recharge page (data is already in sessionStorage)
            window.location.href = 'Recharge.html';
        });
    }

    // Method Tabs
    const methodTabs = document.querySelectorAll('.method-tab');
    const methodContents = document.querySelectorAll('.method-content');

    methodTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            methodTabs.forEach(t => t.classList.remove('active'));
            methodContents.forEach(c => c.classList.remove('active'));

            // Add active class to current tab and content
            tab.classList.add('active');
            document.getElementById(tabId + '-content').classList.add('active');
        });
    });

    // UPI App Selection
    const upiApps = document.querySelectorAll('.upi-app');
    upiApps.forEach(app => {
        app.addEventListener('click', () => {
            upiApps.forEach(a => a.classList.remove('active'));
            app.classList.add('active');
        });
    });

    // Bank Selection
    const bankItems = document.querySelectorAll('.bank-item');
    bankItems.forEach(bank => {
        bank.addEventListener('click', () => {
            bankItems.forEach(b => b.classList.remove('active'));
            bank.classList.add('active');
        });
    });

    // Handle pay button
    const payButton = document.getElementById('payButton');
    if (payButton) {
        payButton.addEventListener('click', function() {
            processPayment();
        });
    }

    // Function to validate email
    function isValidEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    // Payment processing function
    function processPayment() {
        // Get active payment method
        const activeTab = document.querySelector('.method-tab.active');
        let paymentMethod = 'Credit Card';

        if (activeTab) {
            if (activeTab.getAttribute('data-tab') === 'upi') {
                const activeUpiApp = document.querySelector('.upi-app.active');
                paymentMethod = activeUpiApp ?
                    'UPI (' + activeUpiApp.querySelector('.upi-app-name').textContent + ')' :
                    'UPI';
            } else if (activeTab.getAttribute('data-tab') === 'netbanking') {
                const activeBank = document.querySelector('.bank-item.active');
                paymentMethod = activeBank ?
                    'Net Banking (' + activeBank.querySelector('.bank-name').textContent + ')' :
                    'Net Banking';
            }
        }

        // Get email from input field
        const emailInput = document.getElementById('userEmail');
        const userEmail = emailInput ? emailInput.value.trim() : '';

        // Validate email if provided
        if (userEmail && !isValidEmail(userEmail)) {
            // Show error for invalid email
            const emailError = document.getElementById('email-error');
            if (emailError) {
                emailError.textContent = 'Please enter a valid email address';
                emailError.style.display = 'block';
            }
            // Focus on email input
            if (emailInput) emailInput.focus();
            return;
        }

        // Clear any previous errors
        const emailError = document.getElementById('email-error');
        if (emailError) {
            emailError.style.display = 'none';
        }

        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }

        // Generate transaction ID
        const txnId = 'MBC' + Math.floor(Math.random() * 10000000000).toString().padStart(9, '0');

        // Get current date and time
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const fullDateStr = dateStr + ', ' + timeStr;

        // Update transaction details
        const txnIdElement = document.getElementById('txnId');
        const txnDateElement = document.getElementById('txnDate');
        const payMethodElement = document.getElementById('payMethod');

        if (txnIdElement) txnIdElement.textContent = txnId;
        if (txnDateElement) txnDateElement.textContent = fullDateStr;
        if (payMethodElement) payMethodElement.textContent = paymentMethod;

        // Store transaction details in sessionStorage for receipt page
        sessionStorage.setItem('txnId', txnId);
        sessionStorage.setItem('txnDate', fullDateStr);
        sessionStorage.setItem('payMethod', paymentMethod);
        if (userEmail) sessionStorage.setItem('userEmail', userEmail);

        // Ensure planId is a valid number
        let numericPlanId = 0;
        try {
            // Try to parse planId
            numericPlanId = parseInt(planId);
            if (isNaN(numericPlanId)) {
                // If it's still NaN, fallback to a hardcoded value
                console.warn("Plan ID is not a valid number, using default value");
                numericPlanId = 1; // Default to plan ID 1
            }
        } catch (e) {
            console.error("Error parsing plan ID:", e);
            numericPlanId = 1; // Default to plan ID 1
        }

        // Create transaction data object to send to backend
        const rechargeData = {
            mobileNumber: mobileNumber,
            planId: numericPlanId,
            amount: parseFloat(price) || 0,
            paymentMethod: paymentMethod + ' | TxnID: ' + txnId,
            paymentStatus: "Completed",  // Using exact enum value from your schema
            transactionDate: new Date().toISOString(),
            expiryDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
            email: userEmail // Include email for update or notification
        };

        console.log("Sending transaction data to backend:", rechargeData);

        // Send data to the backend
        fetch(`${API_BASE_URL}/api/transactions/recharge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(rechargeData)
        })
            .then(async response => {
                // Get the response body for better error diagnostics
                const responseBody = await response.text();

                if (!response.ok) {
                    console.error("Server error response:", responseBody);
                    throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseBody}`);
                }

                try {
                    // Try to parse as JSON if it is JSON
                    return JSON.parse(responseBody);
                } catch (e) {
                    // If it's not JSON, return the text
                    return responseBody;
                }
            })
            .then(data => {
                console.log('Transaction saved successfully:', data);

                // Hide loading overlay
                if (loadingOverlay) {
                    loadingOverlay.classList.remove('active');
                }

                // Show success modal
                const successModal = document.getElementById('successModal');
                if (successModal) {
                    successModal.classList.add('active');
                }

                // Update progress steps
                const activeStep = document.querySelector('.step-active');
                const inactiveStep = document.querySelector('.step-inactive');

                if (activeStep) activeStep.classList.remove('step-active');
                if (inactiveStep) {
                    inactiveStep.classList.add('step-active');
                    inactiveStep.classList.remove('step-inactive');
                }

                // Send invoice email if email is provided
                if (userEmail) {
                    sendInvoiceEmail(rechargeData, userEmail, fullDateStr, planName || 'Data Plan');
                }
            })
            .catch(error => {
                console.error('Error processing payment:', error);

                // Hide loading overlay
                if (loadingOverlay) {
                    loadingOverlay.classList.remove('active');
                }

                // Show error message
                alert('An error occurred while processing your payment. Please try again.');
            });
    }

    // Function to send invoice email
    function sendInvoiceEmail(transactionData, userEmail, transactionDate, planName) {
        // Prepare data for the API call
        const invoiceData = {
            email: userEmail,
            mobileNumber: transactionData.mobileNumber,
            planName: planName,
            amount: transactionData.amount.toString(),
            transactionId: sessionStorage.getItem('txnId'),
            paymentMethod: sessionStorage.getItem('payMethod'),
            transactionDate: transactionDate
        };

        console.log('Sending invoice to:', userEmail);

        // Send data to the backend
        fetch(`${API_BASE_URL}/api/email/send-invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(invoiceData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Invoice email sent successfully:', data);
            })
            .catch(error => {
                console.error('Error sending invoice email:', error);
                // Don't alert the user about email failure - this is not critical
            });
    }

    // Live card preview updates
    setupCardPreview();

    function setupCardPreview() {
        // Card Number display
        const cardNumberInput = document.getElementById('cardNumber');
        const cardNumberDisplay = document.getElementById('card-number-display');

        if (cardNumberInput && cardNumberDisplay) {
            cardNumberInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                let formattedValue = '';

                for (let i = 0; i < value.length; i++) {
                    if (i > 0 && i % 4 === 0) {
                        formattedValue += ' ';
                    }
                    formattedValue += value[i];
                }

                e.target.value = formattedValue;
                cardNumberDisplay.textContent = formattedValue || '•••• •••• •••• ••••';

                // Update card type based on first digit
                updateCardType(value);
            });
        }

        // Cardholder Name display
        const cardNameInput = document.getElementById('cardName');
        const cardNameDisplay = document.getElementById('card-name-display');

        if (cardNameInput && cardNameDisplay) {
            cardNameInput.addEventListener('input', function(e) {
                cardNameDisplay.textContent = e.target.value.toUpperCase() || 'YOUR NAME';
            });
        }

        // Card Expiry display
        const cardExpiryInput = document.getElementById('cardExpiry');
        const cardDateDisplay = document.getElementById('card-date-display');

        if (cardExpiryInput && cardDateDisplay) {
            cardExpiryInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/[^\d\/]/g, '');
                let parts = value.split('/');

                let month = parts[0] || '';
                let year = parts[1] || '';

                if (month.length > 2) {
                    year = month.substring(2);
                    month = month.substring(0, 2);
                }

                if (month.length === 2 && !value.includes('/')) {
                    month += '/';
                }

                if (parseInt(month) > 12) {
                    month = '12';
                }

                e.target.value = month + year;
                cardDateDisplay.textContent = value || 'MM/YY';
            });
        }

        // CVV display
        const cardCvvInput = document.getElementById('cardCvv');
        const cardCvvDisplay = document.getElementById('card-cvv-display');
        const cardElement = document.getElementById('card');

        if (cardCvvInput && cardCvvDisplay && cardElement) {
            cardCvvInput.addEventListener('focus', () => {
                cardElement.classList.add('flipped');
            });

            cardCvvInput.addEventListener('blur', () => {
                cardElement.classList.remove('flipped');
            });

            cardCvvInput.addEventListener('input', (e) => {
                const value = e.target.value;
                cardCvvDisplay.textContent = value ? value : '•••';
            });
        }
    }

    function updateCardType(cardNumber) {
        // Get logo elements
        const mastercardLogo = document.getElementById('mastercard-logo');
        const visaLogo = document.getElementById('visa-logo');
        const rupayLogo = document.getElementById('rupay-logo');
        const cardTypeText = document.getElementById('card-type-text');
        const bankName = document.getElementById('bank-name');

        // Hide all logos first
        if (mastercardLogo) mastercardLogo.style.display = 'none';
        if (visaLogo) visaLogo.style.display = 'none';
        if (rupayLogo) rupayLogo.style.display = 'none';

        // Determine card type based on first digit
        if (cardNumber.startsWith('4')) {
            // Visa
            if (visaLogo) visaLogo.style.display = 'block';
            if (cardTypeText) cardTypeText.textContent = 'VISA';
            if (bankName) bankName.textContent = 'VISA';
        } else if (cardNumber.startsWith('5')) {
            // Mastercard
            if (mastercardLogo) mastercardLogo.style.display = 'block';
            if (cardTypeText) cardTypeText.textContent = 'MASTERCARD';
            if (bankName) bankName.textContent = 'MASTERCARD';
        } else if (cardNumber.startsWith('6')) {
            // RuPay
            if (rupayLogo) rupayLogo.style.display = 'block';
            if (cardTypeText) cardTypeText.textContent = 'RUPAY';
            if (bankName) bankName.textContent = 'RUPAY';
        } else {
            // Default to Mastercard
            if (mastercardLogo) mastercardLogo.style.display = 'block';
            if (cardTypeText) cardTypeText.textContent = 'CARD';
            if (bankName) bankName.textContent = 'Bank Name';
        }
    }

    // Done button in success modal
    const doneButton = document.getElementById('doneButton');
    if (doneButton) {
        doneButton.addEventListener('click', function() {
            // Hide success modal
            const successModal = document.getElementById('successModal');
            if (successModal) {
                successModal.classList.remove('active');
            }

            // Clear sensitive data before redirecting
            clearSensitiveData();

            // Redirect to home page
            window.location.href = 'Home.html';
        });
    }

    // Helper function to apply UI enhancements
    function applyUIEnhancements() {
        // Add styles for the UI enhancements
        const style = document.createElement('style');
        style.textContent = `
            /* Enlarged card style */
            .flip-card {
                width: 320px !important;
                height: 200px !important;
                margin: 0 auto 3rem !important;
            }
            
            /* Adjust positions for enlarged card */
            .heading_8264 {
                top: 2.5em !important;
                left: 18.6em !important;
                font-size: 0.6em !important;
            }
            
            .logo {
                top: 7em !important;
                left: 12em !important;
                width: 48px !important;
                height: 48px !important;
            }
            
            .chip {
                top: 3em !important;
                left: 2em !important;
                width: 40px !important;
                height: 40px !important;
            }
            
            .contactless {
                top: 4em !important;
                left: 12.5em !important;
                width: 30px !important;
                height: 30px !important;
            }
            
            .number {
                top: 8.5em !important;
                left: 2em !important;
                font-size: 0.7em !important;
            }
            
            .valid_thru {
                top: 11.5em !important;
                left: 5.8em !important;
                font-size: 0.4em !important;
            }
            
            .date_8264 {
                top: 13.8em !important;
                left: 3.4em !important;
                font-size: 0.6em !important;
            }
            
            .name {
                top: 16.5em !important;
                left: 2.2em !important;
                font-size: 0.6em !important;
            }
            
            .bank-indicator {
                bottom: 1.2em !important;
                right: 1.2em !important;
                font-size: 0.6em !important;
            }
            
            /* Mobile number and email display styling */
            .mobile-display {
                display: flex;
                align-items: center;
                background: var(--white);
                border-radius: var(--radius-md);
                padding: 1rem;
                margin-bottom: 0.5rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            
            .mobile-icon {
                width: 2.5rem;
                height: 2.5rem;
                background: var(--primary-bg);
                color: var(--primary);
                border-radius: var(--radius-md);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                margin-right: 1rem;
            }
            
            .mobile-number {
                font-weight: 600;
                font-size: 1.1rem;
                color: var(--dark-blue);
                flex: 1;
            }
            
            .email-container {
                display: flex;
                align-items: center;
                background: var(--white);
                border-radius: var(--radius-md);
                padding: 1rem;
                margin-bottom: 1.5rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            
            .email-icon {
                width: 2.5rem;
                height: 2.5rem;
                background: rgba(255, 56, 92, 0.1);
                color: var(--primary);
                border-radius: var(--radius-md);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                margin-right: 1rem;
                flex-shrink: 0;
            }
            
            .email-field {
                flex: 1;
                position: relative;
            }
            
            .email-input {
                width: 100%;
                padding: 0.5rem;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                font-size: 1rem;
                transition: all 0.3s ease;
            }
            
            .email-input:focus {
                border-color: var(--primary);
                box-shadow: 0 0 0 2px rgba(255, 56, 92, 0.2);
                outline: none;
            }
            
            .email-error {
                color: #dc3545;
                font-size: 0.8rem;
                margin-top: 0.2rem;
                display: none;
            }
            
            .email-label {
                font-size: 0.85rem;
                color: var(--gray);
                margin-bottom: 0.25rem;
                display: block;
            }
            
            .email-desc {
                font-size: 0.75rem;
                color: var(--gray);
                margin-top: 0.25rem;
                display: block;
            }
        `;
        document.head.appendChild(style);
    }

    // Helper function to display mobile number and email input field
    function displayMobileAndEmail(mobileNumber, savedEmail) {
        if (!mobileNumber) return;

        // Get the mobile input directly
        const mobileInput = document.getElementById('mobileNumber');
        if (!mobileInput) return;

        // Find the container of the mobile input (card-form-group)
        const mobileContainer = mobileInput.closest('.card-form-group');
        if (!mobileContainer) return;

        // Create the new mobile display element
        const mobileDisplay = document.createElement('div');
        mobileDisplay.className = 'mobile-display';
        mobileDisplay.innerHTML = `
            <div class="mobile-icon">
                <i class="fas fa-mobile-alt"></i>
            </div>
            <div class="mobile-number">
                ${formatMobileNumber(mobileNumber)}
            </div>
        `;

        // Create email input container
        const emailContainer = document.createElement('div');
        emailContainer.className = 'email-container';
        emailContainer.innerHTML = `
            <div class="email-icon">
                <i class="fas fa-envelope"></i>
            </div>
            <div class="email-field">
                <label class="email-label">Email for Invoice</label>
                <input type="email" id="userEmail" class="email-input" placeholder="Enter your email address" value="${savedEmail || ''}">
                <div id="email-error" class="email-error"></div>
                <span class="email-desc">Invoice will be sent to this email address</span>
            </div>
        `;

        // Replace mobile container with our new elements
        mobileContainer.parentNode.replaceChild(mobileDisplay, mobileContainer);

        // Insert email container after mobile display
        mobileDisplay.parentNode.insertBefore(emailContainer, mobileDisplay.nextSibling);

        // Add event listeners for email validation
        const emailInput = document.getElementById('userEmail');
        if (emailInput) {
            emailInput.addEventListener('input', function() {
                const emailError = document.getElementById('email-error');
                if (emailError) {
                    emailError.style.display = 'none';
                }

                // Store email in sessionStorage as user types
                if (this.value.trim()) {
                    sessionStorage.setItem('userEmail', this.value.trim());
                }
            });

            emailInput.addEventListener('blur', function() {
                const email = this.value.trim();
                if (email && !isValidEmail(email)) {
                    const emailError = document.getElementById('email-error');
                    if (emailError) {
                        emailError.textContent = 'Please enter a valid email address';
                        emailError.style.display = 'block';
                    }
                }
            });
        }
    }

    // Function to clear sensitive data from sessionStorage
    function clearSensitiveData() {
        // Keep only basic info like mobile number, but clear plan details
        // and payment information that's no longer needed
        const mobileNumber = sessionStorage.getItem('mobileNumber');
        const txnId = sessionStorage.getItem('txnId');
        const userEmail = sessionStorage.getItem('userEmail');

        // Clear everything
        sessionStorage.clear();

        // Keep only what's needed for next pages
        sessionStorage.setItem('mobileNumber', mobileNumber);
        sessionStorage.setItem('lastRechargeTime', new Date().toISOString());
        sessionStorage.setItem('lastTransactionId', txnId);
        if (userEmail) sessionStorage.setItem('userEmail', userEmail);
    }
});