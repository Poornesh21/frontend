// recharge.js - Combined Code with Stripe Payment Integration

const API_BASE_URL = 'http://localhost:8080'; // Update with your Spring Boot server URL

// Global array to store all cards for filtering
let allCardsArray = [];

/** Enhanced Error Display **/
function showError(message) {
    const errorAlert = document.getElementById("error-message");
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.classList.remove("d-none");
    }
    console.error(message);
}

/** Improved Fetch Wrapper **/
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

/** Category and Plan Loading **/
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

async function loadPlans() {
    const loadingSpinner = document.getElementById("loading-spinner");
    const tabsContainer = document.getElementById("rechargeTabs");
    const tabContentContainer = document.getElementById("tabContent");

    try {
        // Reset UI
        loadingSpinner.classList.remove("d-none");
        tabsContainer.innerHTML = '';
        tabContentContainer.innerHTML = '';
        allCardsArray = []; // Clear global cards array

        const categories = await loadCategories();
        if (categories.length === 0) {
            showError("No categories found. Unable to load plans.");
            return;
        }

        // Create tabs and content panes for each category
        categories.forEach((category, index) => {
            // Create Tab
            const tab = document.createElement("li");
            tab.className = "nav-item";
            tab.innerHTML = `
                <a class="nav-link ${index === 0 ? 'active' : ''}" onclick="showTab('category-${category.categoryId}', event)">
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

            // Load Plans for this Category and Render Them
            loadPlansForCategory(category.categoryId)
                .then(plans => renderPlans(plans, tabPane, category.categoryName))
                .catch(error => {
                    tabPane.innerHTML = `
                        <p class="text-center text-danger py-4">Failed to load plans: ${error.message}</p>
                    `;
                });
        });
    } catch (error) {
        showError(`Failed to load plans: ${error.message}`);
    } finally {
        loadingSpinner.classList.add("d-none");
    }
}

/** Rendering Plans **/
function renderPlans(plans, tabPane, categoryName) {
    tabPane.innerHTML = ''; // Clear loading indicator
    if (!plans || plans.length === 0) {
        tabPane.innerHTML = '<p class="text-center py-4">No plans available in this category.</p>';
        return;
    }
    plans.forEach(plan => {
        let benefitsMarkup = "";
        let cardMarkup = "";

        // Check for OTT-specific benefits
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
                    <span class="detail-item"><i class="fas fa-phone"></i> Talktime: ${plan.calls || 'N/A'}</span>
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
                    <span class="detail-item"><i class="fas fa-database"></i> Data: ${plan.data || 'N/A'}</span>
                    <span class="detail-item"><i class="fas fa-calendar-alt"></i> Validity: ${plan.validity || 'N/A'}</span>
                    <span class="detail-item"><i class="fas fa-phone"></i> Calls: ${plan.calls || 'Unlimited'}</span>
                    <span class="detail-item"><i class="fas fa-comment-dots"></i> SMS: 100/day</span>
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

/** Error Display for Mobile Number Validation **/
function setupErrorDisplay() {
    const mobileInput = document.getElementById("rechargeMobileNumber");
    if (!mobileInput) return;

    let errorSpan = document.querySelector("#mobile-error-span");
    if (!errorSpan) {
        errorSpan = document.createElement("span");
        errorSpan.id = "mobile-error-span";
        errorSpan.className = "text-danger d-block mt-2 small";
        errorSpan.style.display = "none";
        const inputContainer = mobileInput.closest(".custom-textbox");
        if (inputContainer) {
            inputContainer.parentNode.appendChild(errorSpan);
        } else {
            mobileInput.parentNode.appendChild(errorSpan);
        }
    }
    mobileInput.addEventListener("input", hideError);
}

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

/** Filtering Plans **/
function filterCards() {
    const searchInputVal = document.getElementById("searchInput").value.toLowerCase();
    const dataFilterVal = document.getElementById("dataFilter").value.toLowerCase();
    const validityFilterVal = document.getElementById("validityFilter").value.toLowerCase();
    const globalResults = document.getElementById("globalSearchResults");
    const tabContent = document.getElementById("tabContent");

    if (searchInputVal.trim() !== "") {
        tabContent.style.display = "none";
        globalResults.style.display = "flex";
        globalResults.innerHTML = "";
        let resultsFound = false;

        allCardsArray.forEach(card => {
            const cardData = card.getAttribute("data-data").toLowerCase();
            const cardValidity = card.getAttribute("data-validity").toLowerCase();
            const cardText = card.innerText.toLowerCase();
            const cardPrice = card.getAttribute("data-price");

            const matchesSearch = cardText.includes(searchInputVal) || cardPrice === searchInputVal;
            const matchesData = !dataFilterVal || cardData.includes(dataFilterVal);
            const matchesValidity = !validityFilterVal || cardValidity.includes(validityFilterVal);

            if (matchesSearch && matchesData && matchesValidity) {
                resultsFound = true;
                globalResults.appendChild(card.cloneNode(true));
            }
        });

        if (!resultsFound) {
            globalResults.innerHTML = "<p class='text-center'>No matching plans found.</p>";
        }
    } else {
        tabContent.style.display = "block";
        globalResults.style.display = "none";
    }
}

/** Payment Redirection for Non-Stripe Integration **/
// This function stores plan details and mobile number in sessionStorage,
// then redirects directly to the Payment page.
function redirectToPayment(planDetails) {
    const mobileNumber = document.getElementById("rechargeMobileNumber").value.trim();
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
        showValidationError("Please enter a valid mobile number");
        return;
    }

    // Store details in sessionStorage for use on the payment page
    sessionStorage.setItem('mobileNumber', mobileNumber);
    sessionStorage.setItem('planId', planDetails.id);
    sessionStorage.setItem('price', planDetails.price);
    sessionStorage.setItem('data', planDetails.data || '');
    sessionStorage.setItem('validity', planDetails.validity || '');
    sessionStorage.setItem('calls', planDetails.calls || '');
    sessionStorage.setItem('sms', planDetails.sms || '');
    sessionStorage.setItem('ottBenefits', planDetails.ottBenefits || 'N/A');

    window.location.href = 'Payment.html';
}

/** Mobile Number Update **/
function updateNumber() {
    const mobileInput = document.getElementById("rechargeMobileNumber");
    if (!mobileInput) return;
    const newNumber = mobileInput.value.trim();
    hideError();
    if (!/^[6-9]\d{9}$/.test(newNumber)) {
        showValidationError("Please enter a valid mobile number");
        return;
    }
    sessionStorage.setItem("mobileNumber", newNumber);
    showToast("Mobile number updated successfully!");
}

/** Helper Functions **/
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

/** Tab Navigation **/
function showTab(tabId, event) {
    document.querySelectorAll(".nav-tabs .nav-link").forEach(link => link.classList.remove("active"));
    if (event) {
        event.target.classList.add("active");
    } else {
        const firstTab = document.querySelector(`.nav-tabs .nav-link[onclick*="${tabId}"]`);
        if (firstTab) {
            firstTab.classList.add("active");
        }
    }
    document.querySelectorAll(".tab-pane").forEach(tab => tab.classList.remove("show", "active"));
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add("show", "active");
        document.querySelector(".scrollspy-container").scrollTop = 0;
    }
}

/** DOMContentLoaded Initialization **/
document.addEventListener("DOMContentLoaded", function() {
    // Setup error display for mobile number validation
    setupErrorDisplay();

    // Populate mobile number from sessionStorage if available
    const mobileNumberInput = document.getElementById("rechargeMobileNumber");
    const storedNumber = sessionStorage.getItem("mobileNumber");
    if (mobileNumberInput && storedNumber) {
        mobileNumberInput.value = storedNumber;
    }

    // Load available plans
    loadPlans();

    // Bind search and filter events
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", filterCards);
    }
    const dataFilter = document.getElementById("dataFilter");
    if (dataFilter) {
        dataFilter.addEventListener("change", filterCards);
    }
    const validityFilter = document.getElementById("validityFilter");
    if (validityFilter) {
        validityFilter.addEventListener("change", filterCards);
    }

    // Expose functions to global scope for inline event handlers
    window.redirectToPayment = redirectToPayment;
    window.updateNumber = updateNumber;
    window.showValidationError = showValidationError;
    window.hideError = hideError;
    window.showToast = showToast;
    window.validateNumber = validateNumber;
    window.isNumberKey = isNumberKey;
});

