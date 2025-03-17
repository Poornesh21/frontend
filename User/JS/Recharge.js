// recharge.js - Enhanced Functions for the Recharge Page
const API_BASE_URL = 'http://localhost:8080'; // Update with your Spring Boot server URL

// Global array to store all cards for filtering
let allCardsArray = [];

// Enhanced Error Handling Function
function showError(message) {
    const errorAlert = document.getElementById("error-message");
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.classList.remove("d-none");
        console.error(message); // Also log to console
    } else {
        console.error(message);
    }
}

// Improved Fetch Wrapper with Better Error Handling
async function safeFetch(url, options = {}) {
    try {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        const mergedOptions = { ...defaultOptions, ...options };

        console.log(`Fetching URL: ${url}`, mergedOptions);

        const response = await fetch(url, mergedOptions);

        if (!response.ok) {
            // Try to get more error details
            const errorText = await response.text();
            console.error(`Fetch Error - Status: ${response.status}, Response:`, errorText);

            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error;
    }
}

// Load Categories with Improved Error Handling
async function loadCategories() {
    try {
        const categories = await safeFetch(`${API_BASE_URL}/api/categories`);

        if (!categories || categories.length === 0) {
            showError("No plan categories found. Please try again later.");
            return [];
        }

        console.log('Loaded Categories:', categories);
        return categories;
    } catch (error) {
        showError(`Failed to load categories: ${error.message}`);
        return [];
    }
}

// Load Plans for a Specific Category
async function loadPlansForCategory(categoryId) {
    try {
        const plans = await safeFetch(`${API_BASE_URL}/api/plans?categoryId=${categoryId}`);

        console.log(`Loaded Plans for Category ${categoryId}:`, plans);
        return plans || [];
    } catch (error) {
        console.error(`Error loading plans for category ${categoryId}:`, error);
        return [];
    }
}

// Main Plans Loading Function
async function loadPlans() {
    // Show loading spinner
    const loadingSpinner = document.getElementById("loading-spinner");
    const tabsContainer = document.getElementById("rechargeTabs");
    const tabContentContainer = document.getElementById("tabContent");
    const errorMessage = document.getElementById("error-message");

    try {
        // Reset UI
        loadingSpinner.classList.remove("d-none");
        errorMessage.classList.add("d-none");
        tabsContainer.innerHTML = '';
        tabContentContainer.innerHTML = '';
        allCardsArray = []; // Reset global array

        // Load Categories
        const categories = await loadCategories();

        if (categories.length === 0) {
            showError("No categories found. Unable to load plans.");
            return;
        }

        // Create tabs and content for each category
        categories.forEach((category, index) => {
            // Create Tab
            const tab = document.createElement("li");
            tab.className = "nav-item";
            tab.innerHTML = `
                <a class="nav-link ${index === 0 ? 'active' : ''}" 
                   onclick="showTab('category-${category.categoryId}', event)">
                    ${category.categoryName}
                </a>
            `;
            tabsContainer.appendChild(tab);

            // Create Tab Pane
            const tabPane = document.createElement("div");
            tabPane.className = `tab-pane ${index === 0 ? 'show active' : ''}`;
            tabPane.id = `category-${category.categoryId}`;
            tabContentContainer.appendChild(tabPane);

            // Add loading indicator
            tabPane.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading plans...</span>
                    </div>
                    <p class="mt-2">Loading plans for ${category.categoryName}...</p>
                </div>
            `;

            // Load Plans for this Category
            loadPlansForCategory(category.categoryId).then(plans => {
                renderPlans(plans, tabPane, category.categoryName);
            }).catch(error => {
                tabPane.innerHTML = `
                    <p class="text-center text-danger py-4">
                        Failed to load plans: ${error.message}
                    </p>
                `;
            });
        });
    } catch (error) {
        showError(`Failed to load plans: ${error.message}`);
    } finally {
        // Hide loading spinner
        loadingSpinner.classList.add("d-none");
    }
}

// Render Plans for a Category
function renderPlans(plans, tabPane, categoryName) {
    // Clear loading indicator
    tabPane.innerHTML = '';

    if (!plans || plans.length === 0) {
        tabPane.innerHTML = '<p class="text-center py-4">No plans available in this category.</p>';
        return;
    }

    plans.forEach(plan => {
        let benefitsMarkup = "";
        let cardMarkup = "";

        // Check if this is an OTT plan
        if (categoryName.toLowerCase().includes("ott") && plan.benefits) {
            benefitsMarkup = `
                <div class="ott-benefits">
                    <i class="fas fa-gift"></i>
                    <span class="benefits-text">Benefits:</span> ${plan.benefits}
                </div>
            `;
        }

        // Create card markup based on category
        if (categoryName.toLowerCase().includes("top-up")) {
            cardMarkup = `
                <div class="price-container">
                    <div class="price-tag">₹${plan.price}</div>
                </div>
                <div class="details new-details">
                    <span class="detail-item">
                        <i class="fas fa-phone"></i> Talktime: ${plan.calls || 'N/A'}
                    </span>
                </div>
                <button class="buy-button" onclick='redirectToPayment({
                    "id": "${plan.planId}",
                    "price": "${plan.price}", 
                    "data": "", 
                    "validity": "", 
                    "calls": "${plan.calls || 'N/A'}", 
                    "sms": "", 
                    "ottBenefits": ""
                })'>Recharge</button>
            `;
        } else {
            cardMarkup = `
                <div class="price-container">
                    <div class="price-tag">₹${plan.price}</div>
                </div>
                <div class="details new-details">
                    <span class="detail-item">
                        <i class="fas fa-database"></i> Data: ${plan.data || 'N/A'}
                    </span>
                    <span class="detail-item">
                        <i class="fas fa-calendar-alt"></i> Validity: ${plan.validity || 'N/A'}
                    </span>
                    <span class="detail-item">
                        <i class="fas fa-phone"></i> Calls: ${plan.calls || 'Unlimited'}
                    </span>
                    <span class="detail-item">
                        <i class="fas fa-comment-dots"></i> SMS: 100/day
                    </span>
                </div>
                ${benefitsMarkup}
                <button class="buy-button" onclick='redirectToPayment({
                    "id": "${plan.planId}",
                    "price": "${plan.price}", 
                    "data": "${plan.data || ''}", 
                    "validity": "${plan.validity || ''}", 
                    "calls": "${plan.calls || ''}", 
                    "sms": "100/day", 
                    "ottBenefits": "${plan.benefits || 'N/A'}"
                })'>Recharge</button>
            `;
        }

        const card = document.createElement("div");
        card.className = categoryName.toLowerCase().includes("ott")
            ? "card recharge-card ott-card"
            : "card recharge-card";
        card.setAttribute("data-price", plan.price);
        card.setAttribute("data-data", plan.data || "");
        card.setAttribute("data-validity", plan.validity || "");
        card.setAttribute("data-category", categoryName);
        card.innerHTML = cardMarkup;

        tabPane.appendChild(card);
        allCardsArray.push(card);
    });
}

// Setup error display for mobile number validation
function setupErrorDisplay() {
    const mobileInput = document.getElementById("rechargeMobileNumber");
    if (!mobileInput) return;

    // Create error span if it doesn't exist
    let errorSpan = document.querySelector("#mobile-error-span");
    if (!errorSpan) {
        errorSpan = document.createElement("span");
        errorSpan.id = "mobile-error-span";
        errorSpan.className = "text-danger d-block mt-2 small";
        errorSpan.style.display = "none";

        // Add error span after the input container
        const inputContainer = mobileInput.closest(".custom-textbox");
        if (inputContainer) {
            inputContainer.parentNode.appendChild(errorSpan);
        } else {
            mobileInput.parentNode.appendChild(errorSpan);
        }
    }

    // Clear error when typing
    mobileInput.addEventListener("input", function() {
        hideError();
    });
}

// Show error message in span
function showValidationError(message) {
    const errorSpan = document.querySelector("#mobile-error-span");
    const mobileInput = document.getElementById("rechargeMobileNumber");

    if (errorSpan) {
        errorSpan.textContent = message;
        errorSpan.style.display = "block";
    }

    if (mobileInput) {
        mobileInput.classList.add("border-danger");
    }
}

// Hide error message
function hideError() {
    const errorSpan = document.querySelector("#mobile-error-span");
    const mobileInput = document.getElementById("rechargeMobileNumber");

    if (errorSpan) {
        errorSpan.style.display = "none";
    }

    if (mobileInput) {
        mobileInput.classList.remove("border-danger");
    }
}

// Document Ready Initialization
document.addEventListener("DOMContentLoaded", function() {
    // Setup error display spans
    setupErrorDisplay();

    // Get the mobile number input field from localStorage
    const mobileNumberInput = document.getElementById("rechargeMobileNumber");

    if (mobileNumberInput) {
        // Check if we have a mobile number from localStorage
        const storedNumber = localStorage.getItem("mobileNumber");

        if (storedNumber) {
            // Fill the input field with the stored number
            mobileNumberInput.value = storedNumber;
        }
    }

    // Initial load of plans
    loadPlans();

    // Set up event handlers for search and filters
    document.getElementById("searchInput").addEventListener("input", filterCards);
    document.getElementById("dataFilter").addEventListener("change", filterCards);
    document.getElementById("validityFilter").addEventListener("change", filterCards);
});

// Existing helper functions
function showTab(tabId, event) {
    document.querySelectorAll(".nav-tabs .nav-link").forEach(link => link.classList.remove("active"));
    if(event) {
        event.target.classList.add("active");
    } else {
        const firstTab = document.querySelector(`.nav-tabs .nav-link[onclick*="${tabId}"]`);
        if (firstTab) {
            firstTab.classList.add("active");
        }
    }

    document.querySelectorAll(".tab-pane").forEach(tab => tab.classList.remove("show", "active"));
    const activeTab = document.getElementById(tabId);
    if(activeTab) {
        activeTab.classList.add("show", "active");
        document.querySelector(".scrollspy-container").scrollTop = 0;
    }
}

function filterCards() {
    const searchInputVal = document.getElementById("searchInput").value.toLowerCase();
    const dataFilterVal = document.getElementById("dataFilter").value.toLowerCase();
    const validityFilterVal = document.getElementById("validityFilter").value.toLowerCase();

    const globalResults = document.getElementById("globalSearchResults");
    const tabContent = document.getElementById("tabContent");

    if(searchInputVal.trim() !== "") {
        tabContent.style.display = "none";
        globalResults.style.display = "flex";
        globalResults.innerHTML = "";
        let resultsFound = false;

        allCardsArray.forEach(card => {
            const cardData = card.getAttribute("data-data").toLowerCase();
            const cardValidity = card.getAttribute("data-validity").toLowerCase();
            const cardText = card.innerText.toLowerCase();
            const cardPrice = card.getAttribute("data-price");

            const matchesSearch = cardText.includes(searchInputVal) ||
                cardPrice === searchInputVal;
            const matchesData = !dataFilterVal || cardData.includes(dataFilterVal);
            const matchesValidity = !validityFilterVal || cardValidity.includes(validityFilterVal);

            if(matchesSearch && matchesData && matchesValidity) {
                resultsFound = true;
                globalResults.appendChild(card.cloneNode(true));
            }
        });

        if(!resultsFound) {
            globalResults.innerHTML = "<p class='text-center'>No matching plans found.</p>";
        }
    } else {
        tabContent.style.display = "block";
        globalResults.style.display = "none";
    }
}

// Updated redirectToPayment function with error span messages
function redirectToPayment(planDetails) {
    const mobileNumber = document.getElementById("rechargeMobileNumber").value.trim();

    // Hide previous error
    hideError();

    // Basic format validation
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
        showValidationError("Please enter a valid mobile number");
        return;
    }

    // Validate mobile number with the server before proceeding
    fetch(`${API_BASE_URL}/api/auth/validate-mobile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: mobileNumber
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.token) {
                // Valid Mobi Comm number - save and proceed to payment
                localStorage.setItem("mobileNumber", mobileNumber);

                // Add plan ID to the stored plan for the payment page
                const queryParams = new URLSearchParams({
                    mobile: mobileNumber,
                    planId: planDetails.id,
                    price: planDetails.price,
                    data: planDetails.data,
                    validity: planDetails.validity,
                    calls: planDetails.calls,
                    sms: planDetails.sms,
                    ottBenefits: planDetails.ottBenefits || 'N/A'
                }).toString();

                window.location.href = "Payment.html?" + queryParams;
            } else {
                // Invalid number - show error
                showValidationError("Enter the valid MobiComm number");
            }
        })
        .catch(error => {
            console.error('Validation error:', error);
            showValidationError("An error occurred. Please try again.");
        });
}

// Updated updateNumber function with error span messages
function updateNumber() {
    const mobileInput = document.getElementById("rechargeMobileNumber");
    const changeLink = document.querySelector('.change-link');
    const newNumber = mobileInput.value.trim();

    // Hide previous error
    hideError();

    // Basic validation
    if (!/^[6-9]\d{9}$/.test(newNumber)) {
        showValidationError("Please enter a valid mobile number");
        return;
    }

    // Show loading state
    changeLink.textContent = "Validating...";

    // Validate mobile number with the server
    fetch(`${API_BASE_URL}/api/auth/validate-mobile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: newNumber
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.token) {
                // Valid number, update localStorage and show success message
                localStorage.setItem("mobileNumber", newNumber);
                hideError();
                showToast("Mobile number updated successfully!");
            } else {
                // Invalid number, show error
                showValidationError("Enter the valid MobiComm number");
            }
        })
        .catch(error => {
            console.error('Validation error:', error);
            showValidationError("An error occurred. Please try again.");
        })
        .finally(() => {
            changeLink.textContent = "Change";
        });
}

function showToast(message) {
    const toastEl = document.getElementById("toast");
    document.getElementById("toast-message").textContent = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

function validateNumber(input) {
    input.value = input.value.replace(/\D/g, "");
}

function isNumberKey(event) {
    const charCode = event.which ? event.which : event.keyCode;
    return charCode >= 48 && charCode <= 57;
}
// recharge.js - Modified to use sessionStorage instead of URL parameters
document.addEventListener('DOMContentLoaded', function() {
    // Get mobile number from sessionStorage (this could be from home page or payment page navigation)
    const mobileNumber = sessionStorage.getItem('mobileNumber');

    // Populate mobile number field if available
    const mobileNumberInput = document.getElementById('rechargeMobileNumber');
    if (mobileNumberInput && mobileNumber) {
        mobileNumberInput.value = mobileNumber;
    }

    // Function to redirect to payment page
    function redirectToPayment(planDetails) {
        // Get current mobile number (could be updated by user)
        const currentMobileNumber = document.getElementById('rechargeMobileNumber').value.trim();

        // Basic format validation
        if (!/^[6-9]\d{9}$/.test(currentMobileNumber)) {
            showValidationError("Please enter a valid mobile number");
            return;
        }

        // Store all plan details and mobile number in sessionStorage
        sessionStorage.setItem('mobileNumber', currentMobileNumber);
        sessionStorage.setItem('planId', planDetails.id);
        sessionStorage.setItem('price', planDetails.price);
        sessionStorage.setItem('data', planDetails.data || '');
        sessionStorage.setItem('validity', planDetails.validity || '');
        sessionStorage.setItem('calls', planDetails.calls || '');
        sessionStorage.setItem('sms', planDetails.sms || '');
        sessionStorage.setItem('ottBenefits', planDetails.ottBenefits || 'N/A');

        // Navigate to payment page (without exposing parameters in URL)
        window.location.href = 'Payment.html';
    }

    // Make the redirectToPayment function global so it can be called from onclick handlers
    window.redirectToPayment = redirectToPayment;

    // Setup error display for mobile number validation
    function setupErrorDisplay() {
        const mobileInput = document.getElementById("rechargeMobileNumber");
        if (!mobileInput) return;

        // Create error span if it doesn't exist
        let errorSpan = document.querySelector("#mobile-error-span");
        if (!errorSpan) {
            errorSpan = document.createElement("span");
            errorSpan.id = "mobile-error-span";
            errorSpan.className = "text-danger d-block mt-2 small";
            errorSpan.style.display = "none";

            // Add error span after the input container
            const inputContainer = mobileInput.closest(".custom-textbox");
            if (inputContainer) {
                inputContainer.parentNode.appendChild(errorSpan);
            } else {
                mobileInput.parentNode.appendChild(errorSpan);
            }
        }

        // Clear error when typing
        mobileInput.addEventListener("input", function() {
            hideError();
        });
    }

    // Show error message in span
    function showValidationError(message) {
        const errorSpan = document.querySelector("#mobile-error-span");
        const mobileInput = document.getElementById("rechargeMobileNumber");

        if (errorSpan) {
            errorSpan.textContent = message;
            errorSpan.style.display = "block";
        }

        if (mobileInput) {
            mobileInput.classList.add("border-danger");
        }
    }

    // Hide error message
    function hideError() {
        const errorSpan = document.querySelector("#mobile-error-span");
        const mobileInput = document.getElementById("rechargeMobileNumber");

        if (errorSpan) {
            errorSpan.style.display = "none";
        }

        if (mobileInput) {
            mobileInput.classList.remove("border-danger");
        }
    }

    // Make the validation functions globally available if needed by inline event handlers
    window.showValidationError = showValidationError;
    window.hideError = hideError;

    // Setup error display
    setupErrorDisplay();

    // Handle the "Update Number" functionality if present
    const changeLink = document.querySelector('.change-link');
    if (changeLink) {
        changeLink.addEventListener('click', function() {
            updateNumber();
        });
    }
    function redirectToPayment(planDetails) {
        // Get mobile number
        const mobileNumber = document.getElementById("rechargeMobileNumber").value.trim();

        // Simple validation
        if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
            alert("Please enter a valid mobile number");
            return;
        }

        // Create request data
        const data = {
            price: planDetails.price,
            mobileNumber: mobileNumber,
            planId: planDetails.id
        };

        // Send to server
        fetch('/create-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(data => {
                // Redirect to Stripe
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    alert("Error: " + (data.error || "Could not process payment"));
                }
            })
            .catch(error => {
                alert("Error: Could not connect to payment service");
            });
    }

// Add this function to your existing JavaScript file

// Replace all your "redirectToPayment" code with this simple version
    function redirectToPayment(planDetails) {
        // Get mobile number
        const mobileNumber = document.getElementById("rechargeMobileNumber").value.trim();

        // Simple validation
        if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
            alert("Please enter a valid mobile number");
            return;
        }

        // Create request data
        const data = {
            price: planDetails.price,
            mobileNumber: mobileNumber,
            planId: planDetails.id
        };

        // Use the full URL with the correct port (8080 for Spring Boot)
        fetch('http://localhost:8080/create-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(data => {
                // Redirect to Stripe
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    alert("Error: " + (data.error || "Could not process payment"));
                }
            })
            .catch(error => {
                console.error("Payment error:", error);
                alert("Error: Could not connect to payment service");
            });
    }

    // Updated updateNumber function
    function updateNumber() {
        const mobileInput = document.getElementById("rechargeMobileNumber");
        if (!mobileInput) return;

        const newNumber = mobileInput.value.trim();

        // Hide previous error
        hideError();

        // Basic validation
        if (!/^[6-9]\d{9}$/.test(newNumber)) {
            showValidationError("Please enter a valid mobile number");
            return;
        }

        // Update sessionStorage
        sessionStorage.setItem("mobileNumber", newNumber);

        // Show success message
        showToast("Mobile number updated successfully!");
    }

    // Make updateNumber globally available if needed by inline event handlers
    window.updateNumber = updateNumber;

    // Helper functions
    function showToast(message) {
        const toastEl = document.getElementById("toast");
        if (!toastEl) return;

        document.getElementById("toast-message").textContent = message;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }

    function validateNumber(input) {
        input.value = input.value.replace(/\D/g, "");
    }

    function isNumberKey(event) {
        const charCode = event.which ? event.which : event.keyCode;
        return charCode >= 48 && charCode <= 57;
    }

    // Make helper functions globally available for inline event handlers
    window.showToast = showToast;
    window.validateNumber = validateNumber;
    window.isNumberKey = isNumberKey;
});