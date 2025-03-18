// Constants
const API_BASE_URL = 'http://localhost:8080'; // Update with your Spring Boot server URL
const PLANS_API_URL = `${API_BASE_URL}/api/admin/plans`;
const PUBLIC_PLANS_API_URL = `${API_BASE_URL}/api/plans`;
const CATEGORIES_API_URL = `${API_BASE_URL}/api/categories`;
const ADMIN_CATEGORIES_API_URL = `${API_BASE_URL}/api/admin/categories`;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const planTableBody = document.getElementById('planTableBody');
const planCount = document.getElementById('planCount');
const alertsContainer = document.getElementById('alertsContainer');

// Bootstrap Modal Instances
let addPlanModal, editPlanModal;

// Data
let plansData = [];
let categoriesData = [];
let selectedPlan = null;

// Function to properly close modal and remove backdrop
function closeModal(modalInstance) {
    if (!modalInstance) return;
    modalInstance.hide();
    setTimeout(() => {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }, 200);
}

// Fetch wrapper with console debug logs
async function fetchData(url, options = {}) {
    console.log(`FETCH: Attempting to fetch data from ${url}`);

    // Get token from localStorage
    const token = localStorage.getItem('token');

    console.log(`FETCH: Using token: ${token ? "Yes (token exists)" : "No token found"}`);

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        mode: 'cors'
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };

    try {
        console.log(`FETCH: Request options:`, mergedOptions);

        // Use a regular fetch without auth for public endpoints (categories)
        const isPublicEndpoint = url.includes('/api/categories') || url.includes('/api/plans');

        let response;
        if (isPublicEndpoint && !url.includes('/api/admin')) {
            // For public endpoints, try without authentication first
            response = await fetch(url, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log(`FETCH: Public endpoint response status: ${response.status}`);
        } else {
            // For admin endpoints, use authentication
            response = await fetch(url, mergedOptions);
            console.log(`FETCH: Admin endpoint response status: ${response.status}`);
        }

        if (response.status === 401) {
            console.error('FETCH ERROR: Authentication token expired or invalid.');
            showAlert('Authentication failed. Please login again.', 'danger');
            return;
        }

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`);
        }

        console.log(`FETCH SUCCESS: Got response from ${url}`);
        return response;
    } catch (error) {
        console.error('FETCH ERROR:', error);

        if (error.message.includes('Failed to fetch')) {
            console.error('FETCH ERROR: Network error - server might be down or CORS issue');
            showAlert('Network error. Ensure backend is running and CORS is configured.', 'danger');
        } else {
            console.error(`FETCH ERROR: ${error.message}`);
            showAlert(`Error: ${error.message}`, 'danger');
        }

        // For debugging, try fetching without auth header
        if (!url.includes('/api/categories') && !url.includes('/api/plans')) {
            console.log('FETCH DEBUG: Trying without auth header to test CORS...');
            try {
                const debugResponse = await fetch(url, {
                    headers: { 'Content-Type': 'application/json' }
                });
                console.log(`FETCH DEBUG: Response without auth: ${debugResponse.status}`);
            } catch (debugError) {
                console.error('FETCH DEBUG ERROR:', debugError);
            }
        }

        throw error;
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');



    document.querySelectorAll('.modal').forEach(modalEl => {
        modalEl.addEventListener('hidden.bs.modal', function () {
            console.log('Modal hidden event triggered for', this.id);
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
    });

    const addModalElement = document.querySelector('#addPlanModal');
    const editModalElement = document.querySelector('#editPlanModal');

    if (addModalElement) {
        addPlanModal = new bootstrap.Modal(addModalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        console.log("Add plan modal initialized");
    } else {
        console.error("Add plan modal element not found in DOM");
    }

    if (editModalElement) {
        editPlanModal = new bootstrap.Modal(editModalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        console.log("Edit plan modal initialized");
    } else {
        console.error("Edit plan modal element not found in DOM");
    }

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('sidebar-mobile');
        });
    }

    const cancelButtons = document.querySelectorAll('[data-bs-dismiss="modal"]');
    cancelButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modalElement = this.closest('.modal');
            if (modalElement) {
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    closeModal(modalInstance);
                }
            }
        });
    });

    fetchPlans();
    fetchCategories();
});

// Create debug panel

// Login as admin to get a valid token
async function loginAsAdmin() {
    try {
        console.log("Attempting to login as admin...");
        addDebugInfo("Logging in as admin");

        // Use the provided hardcoded admin credentials in SecurityConfig
        const loginData = {
            username: "admin",
            password: "adminpassword"
        };

        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        if (!response.ok) {
            throw new Error(`Login failed: ${response.status}`);
        }

        const authData = await response.json();
        console.log("Login successful", authData);

        // Store the real token from backend
        if (authData.token) {
            localStorage.setItem('token', authData.token);
            showAlert('Admin login successful', 'success');
            addDebugInfo("Admin login successful - using real token now");

            // Refresh data with the new token
            await fetchPlans();
            await fetchCategories();
        }
    } catch (error) {
        console.error("Login failed:", error);
        addDebugInfo(`Login error: ${error.message}`);
        showAlert(`Login failed: ${error.message}`, 'danger');
    }
}

// Test all endpoints directly
async function testEndpoints() {
    const debugContent = document.getElementById('debugContent');
    debugContent.innerHTML = '<p>Testing endpoints...</p>';

    try {
        // Test categories endpoint (public)
        debugContent.innerHTML += '<p>Testing categories endpoint...</p>';
        const categoriesResponse = await fetch(`${API_BASE_URL}/api/categories`);
        const categoriesStatus = categoriesResponse.status;
        debugContent.innerHTML += `<p>Categories status: ${categoriesStatus}</p>`;

        if (categoriesResponse.ok) {
            const categoriesData = await categoriesResponse.json();
            debugContent.innerHTML += `<p>Categories count: ${categoriesData.length}</p>`;
        }

        // Test plans endpoint (public)
        debugContent.innerHTML += '<p>Testing public plans endpoint...</p>';
        const plansResponse = await fetch(`${API_BASE_URL}/api/plans`);
        const plansStatus = plansResponse.status;
        debugContent.innerHTML += `<p>Public plans status: ${plansStatus}</p>`;

        if (plansResponse.ok) {
            const plansData = await plansResponse.json();
            debugContent.innerHTML += `<p>Public plans count: ${plansData.length}</p>`;
        }

        // Test admin plans endpoint
        debugContent.innerHTML += '<p>Testing admin plans endpoint...</p>';
        const token = localStorage.getItem('token');
        const adminPlansResponse = await fetch(`${API_BASE_URL}/api/admin/plans`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const adminPlansStatus = adminPlansResponse.status;
        debugContent.innerHTML += `<p>Admin plans status: ${adminPlansStatus}</p>`;

        if (adminPlansResponse.ok) {
            const adminPlansData = await adminPlansResponse.json();
            debugContent.innerHTML += `<p>Admin plans count: ${adminPlansData.length}</p>`;
        }

    } catch (error) {
        debugContent.innerHTML += `<p class="text-danger">Error: ${error.message}</p>`;
    }
}

// FIXED: Fetch plans from the backend, trying public endpoint first
async function fetchPlans() {
    try {
        planTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 mb-0">Loading plans data...</p>
                </td>
            </tr>
        `;

        console.log("First trying public plans endpoint...");
        addDebugInfo("Trying public plans endpoint first");

        // Try public endpoint first
        let backendPlans = [];
        let usePublicEndpoint = false;

        try {
            const publicResponse = await fetch(`${API_BASE_URL}/api/plans`);
            console.log("Public plans endpoint status:", publicResponse.status);

            if (publicResponse.ok) {
                backendPlans = await publicResponse.json();
                console.log("Public plans available:", backendPlans.length);
                addDebugInfo(`Public plans available: ${backendPlans.length}`);
                usePublicEndpoint = true;
            }
        } catch (e) {
            console.error("Error checking public plans:", e);
            addDebugInfo(`Error checking public plans: ${e.message}`);
        }

        // If public endpoint fails, try admin endpoint
        if (!usePublicEndpoint) {
            console.log("Public endpoint failed, trying admin endpoint...");
            addDebugInfo("Trying admin endpoint");

            const response = await fetchData(PLANS_API_URL);
            if (!response) {
                throw new Error("No response from admin plans API");
            }

            backendPlans = await response.json();
            console.log("Plans from admin API:", backendPlans.length);
            addDebugInfo(`Received ${backendPlans.length} plans from admin API`);
        }

        console.log("Raw plans data from API:", backendPlans);

        if (!Array.isArray(backendPlans)) {
            console.warn("Backend did not return an array, using empty array instead");
            addDebugInfo("API didn't return an array! Using empty array instead.");
            backendPlans = [];
        }

        // Transform the plans data from backend format to frontend format
        plansData = backendPlans.map(plan => {
            const planId = plan.planId || plan.id;
            console.log(`Processing plan ${planId}:`, plan);

            let categoryName = plan.categoryName || plan.category;
            if (!categoryName && plan.categoryId) {
                const category = categoriesData.find(c => c.id == plan.categoryId || c.categoryId == plan.categoryId);
                categoryName = category ? (category.name || category.categoryName) : 'Uncategorized';
            }

            return {
                id: planId,
                categoryId: plan.categoryId,
                category: categoryName || 'Uncategorized',
                planName: plan.planName || 'Unnamed Plan',
                price: typeof plan.price === 'number' ? plan.price : parseFloat(plan.price) || 0,
                data: plan.data || plan.dataLimit || '-',
                validity: plan.validity || (plan.validityDays ? plan.validityDays + ' days' : '-'),
                calls: plan.calls || 'Unlimited',
                benefits: plan.benefits || plan.ottBenefits || 'No additional benefits',
                // Support both isActive and active properties
                active: plan.isActive === true || plan.active === true || plan.status === 'Active'
            };
        });

        console.log("Transformed plans data:", plansData);
        addDebugInfo(`Transformed ${plansData.length} plans for display`);
        renderTable();

        if (plansData.length > 0) {
        } else {
            showAlert('No plans found. You can add new plans.', 'info');
        }
    } catch (error) {
        console.error("Error in fetch operation:", error);
        addDebugInfo(`Error: ${error.message}`);
        plansData = [];
        renderTable();
        showAlert('Failed to load plans from server. Please ensure the backend service is running.', 'warning');
    }
}

// Add debug info to the debug panel
function addDebugInfo(message) {
    const debugContent = document.getElementById('debugContent');
    if (debugContent) {
        const time = new Date().toLocaleTimeString();
        debugContent.innerHTML += `<div>[${time}] ${message}</div>`;
        debugContent.scrollTop = debugContent.scrollHeight;
    }
}

// Fetch categories from the backend API
async function fetchCategories() {
    try {
        const categoryDropdowns = document.querySelectorAll('.category-dropdown, #category, #editCategory');
        categoryDropdowns.forEach(dropdown => {
            if (dropdown) dropdown.innerHTML = '<option value="">Loading categories...</option>';
        });

        console.log("Fetching categories from:", CATEGORIES_API_URL);
        const response = await fetchData(CATEGORIES_API_URL);
        if (!response) {
            throw new Error("No response from categories API");
        }

        const categories = await response.json();
        console.log("Raw categories response:", categories);

        if (!Array.isArray(categories)) {
            console.warn("Categories API did not return an array");
            addDebugInfo("Categories API didn't return an array!");
            categoriesData = [];
        } else {
            categoriesData = categories
                .filter(category => category && (category.categoryId || category.id) && (category.categoryName || category.name))
                .map(category => ({
                    id: category.categoryId || category.id,
                    name: category.categoryName || category.name
                }));
        }

        console.log("Mapped categories data:", categoriesData);

        if (categoriesData.length > 0) {
            populateCategoryDropdowns();
        } else {

            populateCategoryDropdowns();
        }
    } catch (error) {
        console.error("Error fetching categories:", error);
        addDebugInfo(`Category error: ${error.message}`);
        categoriesData = [];
        showAlert('Failed to load categories from server. Please add a new category to begin.', 'warning');
        populateCategoryDropdowns();
    }
}

// Populate category dropdowns with "New Category" option
function populateCategoryDropdowns() {
    const categorySelect = document.getElementById('category');
    const editCategorySelect = document.getElementById('editCategory');

    if (!categorySelect && !editCategorySelect) {
        console.error("No category select elements found");
        return;
    }

    const populateDropdown = (dropdown) => {
        if (!dropdown) return;
        const currentValue = dropdown.value;
        console.log(`Current dropdown value before repopulating: ${currentValue}`);
        dropdown.innerHTML = '<option value="">Select Category</option>';
        const newOption = document.createElement('option');
        newOption.value = "new";
        newOption.textContent = "➕ Add New Category";
        newOption.className = "text-primary";
        dropdown.appendChild(newOption);
        if (categoriesData.length > 0) {
            console.log("Adding categories to dropdown:", categoriesData);
            categoriesData.forEach(category => {
                if (!category.id || !category.name) {
                    console.warn("Invalid category object:", category);
                    return;
                }
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                dropdown.appendChild(option);
            });
        } else {
            const emptyOption = document.createElement('option');
            emptyOption.disabled = true;
            emptyOption.textContent = "No categories available - please add one";
            dropdown.appendChild(emptyOption);
        }
        const newDropdown = dropdown.cloneNode(true);
        dropdown.parentNode.replaceChild(newDropdown, dropdown);
        newDropdown.addEventListener('change', function() {
            if (this.value === "new") {
                showNewCategoryModal(this);
            }
        });
        if (currentValue && currentValue !== "new") {
            const option = newDropdown.querySelector(`option[value="${currentValue}"]`);
            if (option) {
                newDropdown.value = currentValue;
                console.log(`Restored dropdown value to: ${currentValue}`);
            }
        }
        return newDropdown;
    };

    if (categorySelect) {
        populateDropdown(categorySelect);
    }
    if (editCategorySelect) {
        populateDropdown(editCategorySelect);
    }
    console.log(`Category dropdowns populated with ${categoriesData.length} options from database`);
}

// Update plan count badge
function updatePlanCount() {
    if (planCount) {
        planCount.textContent = `${plansData.length} plan${plansData.length !== 1 ? 's' : ''}`;
    }
}

// Render plan table
function renderTable() {
    planTableBody.innerHTML = '';

    // For debugging, show the actual plan data we have
    addDebugInfo(`Rendering table with ${plansData.length} plans`);

    const sortedPlans = [...plansData].sort((a, b) => {
        if (a.active !== b.active) return b.active - a.active;
        return a.price - b.price;
    });

    console.log("Rendering table with plans:", sortedPlans);

    if (sortedPlans.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="text-center py-4">
                No plans found. 
                <button class="btn btn-sm btn-primary ms-2" id="addFirstPlanBtn">Add your first plan</button>
            </td>
        `;
        planTableBody.appendChild(row);
        const addFirstPlanBtn = document.getElementById('addFirstPlanBtn');
        if (addFirstPlanBtn) {
            addFirstPlanBtn.addEventListener('click', function() {
                if (categoriesData.length === 0) {
                    showAlert("Please add a category first before creating a plan.", "warning");
                    showNewCategoryModal(null);
                } else {
                    openAddPlanModal();
                }
            });
        }
        updatePlanCount();
        return;
    }

    sortedPlans.forEach(plan => {
        const row = document.createElement('tr');
        row.classList.add('plan-row');
        row.setAttribute('data-plan-id', plan.id);
        const category = plan.category || 'Uncategorized';
        const price = plan.price || 0;
        const data = plan.data || '-';
        const validity = plan.validity || '-';
        const calls = plan.calls || '-';
        const benefits = plan.benefits || '-';
        const active = plan.active !== undefined ? plan.active : true;

        row.innerHTML = `
          <td class="fw-semibold">${category}</td>
          <td>₹${price}</td>
          <td>${data}</td>
          <td>${validity}</td>
          <td>${calls}</td>
          <td>${benefits}</td>
          <td class="text-center">
            <div class="form-check form-switch d-flex justify-content-center">
              <input class="form-check-input" type="checkbox" role="switch"
                     id="status-${plan.id}" ${active ? 'checked' : ''}
                     onchange="togglePlanStatus(${plan.id})">
            </div>
          </td>
          <td class="text-center">
            <div class="action-buttons">
              <button type="button" class="text-primary" data-bs-toggle="tooltip" title="Edit Plan" onclick="openEditModal(${plan.id})">
                <i class="bi bi-pencil-fill"></i>
              </button>
            </div>
          </td>
        `;

        planTableBody.appendChild(row);
    });

    updatePlanCount();

    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Updated toggle plan status function with explicit state update and flexible response property
async function togglePlanStatus(planId) {
    const switchElement = document.getElementById(`status-${planId}`);
    if (!switchElement) {
        console.error(`No switch found for plan ID: ${planId}`);
        showAlert('Unable to find status switch', 'danger');
        return;
    }

    // Read the new state directly from the checkbox.
    const newState = switchElement.checked;

    try {
        // Disable the switch to prevent multiple rapid clicks.
        switchElement.disabled = true;
        console.log(`Toggling plan ${planId} status. New state (from checkbox): ${newState}`);

        // Call the backend PATCH endpoint for toggling the status.
        const response = await fetchData(`${PLANS_API_URL}/${planId}/toggle-status`, {
            method: 'PATCH'
        });
        const updatedPlan = await response.json();
        console.log('Backend response:', updatedPlan);

        // Use the returned "active" property (which is a Boolean) to set the updated state.
        const updatedState = updatedPlan.active === true || updatedPlan.isActive === true;
        console.log(`Updated state for plan ${planId}: ${updatedState}`);

        // Update the local plansData array.
        const index = plansData.findIndex(p => p.id === planId);
        if (index !== -1) {
            plansData[index].active = updatedState;
            plansData[index].isActive = updatedState;
            plansData[index].status = updatedState ? 'Active' : 'Inactive';
        }

        // Reflect the updated state in the switch element.
        switchElement.checked = updatedState;

        // Re-render the table to ensure UI consistency.
        renderTable();

        showAlert(`Plan has been ${updatedState ? 'activated' : 'deactivated'}`, 'success');
    } catch (error) {
        console.error('Error in togglePlanStatus:', error);
        // Revert the checkbox to its previous state in case of error.
        switchElement.checked = !newState;
        showAlert('Failed to update plan status. Please try again.', 'danger');
    } finally {
        // Re-enable the switch.
        switchElement.disabled = false;
    }
}

// Open add plan modal
function openAddPlanModal() {
    console.log("Opening add plan modal");
    if (categoriesData.length === 0) {
        showAlert("Please add a category first before creating a plan.", "warning");
        showNewCategoryModal(null);
        return;
    }
    if (!addPlanModal) {
        const modalElement = document.getElementById('addPlanModal');
        if (modalElement) {
            addPlanModal = new bootstrap.Modal(modalElement);
            console.log("Add plan modal initialized on demand");
        } else {
            console.error("Add plan modal element not found");
            showAlert("Could not open the add plan form", "danger");
            return;
        }
    }
    const form = document.getElementById('planForm');
    if (form) {
        form.reset();
    }
    addPlanModal.show();
    console.log("Add plan modal opened");
}

// Open edit plan modal
function openEditModal(planId) {
    console.log(`Opening edit modal for plan ID: ${planId}`);
    selectedPlan = plansData.find(plan => plan.id === planId);
    console.log("Selected plan:", selectedPlan);
    if (!selectedPlan) {
        console.error(`Plan with ID ${planId} not found`);
        showAlert("Cannot edit plan. Plan not found.", "danger");
        return;
    }
    if (categoriesData.length === 0) {
        showAlert("Please add a category first before editing a plan.", "warning");
        showNewCategoryModal(null);
        return;
    }
    if (!editPlanModal) {
        const modalElement = document.getElementById('editPlanModal');
        if (modalElement) {
            editPlanModal = new bootstrap.Modal(modalElement);
            console.log("Edit plan modal initialized on demand");
        } else {
            console.error("Edit plan modal element not found");
            showAlert("Could not open the edit form", "danger");
            return;
        }
    }
    document.getElementById('editPlanId').value = selectedPlan.id;
    const editCategory = document.getElementById('editCategory');
    if (editCategory) {
        console.log(`Setting category select to ${selectedPlan.categoryId}`);
        editCategory.value = selectedPlan.categoryId || '';
    }
    document.getElementById('editPrice').value = selectedPlan.price || '';
    document.getElementById('editData').value = selectedPlan.data || '';
    document.getElementById('editValidity').value = selectedPlan.validity || '';
    document.getElementById('editCalls').value = selectedPlan.calls || '';
    document.getElementById('editBenefits').value = selectedPlan.benefits || '';
    editPlanModal.show();
    console.log("Edit modal shown");
}

// Save new plan
async function savePlan() {
    const form = document.getElementById('planForm');
    if (!form) {
        console.error("Plan form not found");
        showAlert("Form not found. Please refresh the page and try again.", "danger");
        return;
    }
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    const categoryElement = document.getElementById('category');
    if (!categoryElement || !categoryElement.value) {
        showAlert("Please select a category", "warning");
        return;
    }
    const categoryId = parseInt(categoryElement.value);
    if (isNaN(categoryId)) {
        showAlert("Invalid category selection", "warning");
        return;
    }
    console.log("Looking for category with ID:", categoryId);
    console.log("Available categories:", categoriesData);
    const categoryObj = categoriesData.find(c => c.id == categoryId);
    if (!categoryObj) {
        console.error(`Category with ID ${categoryId} not found in local data`);
        showAlert("Selected category not found. Try refreshing the page.", "warning");
        return;
    }
    const getPlanName = () => {
        const planNameElement = document.getElementById('planName');
        return planNameElement ? planNameElement.value || 'New Plan' : 'New Plan';
    };
    const getPrice = () => {
        const priceElement = document.getElementById('price');
        return priceElement && priceElement.value ? parseFloat(priceElement.value) : 0;
    };
    const getFormValue = (id, defaultValue = '') => {
        const element = document.getElementById(id);
        return element ? element.value || defaultValue : defaultValue;
    };
    const newPlan = {
        categoryId: categoryId,
        categoryName: categoryObj.name,
        planName: getPlanName(),
        price: getPrice(),
        data: getFormValue('data'),
        validity: getFormValue('validity'),
        calls: getFormValue('calls'),
        benefits: getFormValue('benefits'),
        isActive: true
    };
    console.log("Attempting to save plan:", newPlan);
    try {
        const response = await fetchData(PLANS_API_URL, {
            method: 'POST',
            body: JSON.stringify(newPlan)
        });
        const createdPlan = await response.json();
        console.log("Plan created successfully:", createdPlan);
        const frontendPlan = {
            id: createdPlan.planId || createdPlan.id,
            categoryId: createdPlan.categoryId,
            category: categoryObj.name,
            planName: createdPlan.planName,
            price: createdPlan.price,
            data: createdPlan.data,
            validity: createdPlan.validity,
            calls: createdPlan.calls || 'Unlimited',
            benefits: createdPlan.benefits || 'No additional benefits',
            active: createdPlan.isActive !== undefined ? createdPlan.isActive : true
        };
        plansData.push(frontendPlan);
        closeModal(addPlanModal);
        form.reset();
        renderTable();
        showAlert(`New ${frontendPlan.category} plan has been added`, 'success');
    } catch (error) {
        console.error("Error creating plan:", error);
        showAlert("Failed to save plan to the database. Please check the server connection and try again.", "danger");
    }
}

// Update existing plan
async function updatePlan() {
    const form = document.getElementById('editPlanForm');
    if (!form) {
        console.error("Edit plan form not found");
        showAlert("Form not found. Please refresh the page and try again.", "danger");
        return;
    }
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    if (!selectedPlan) {
        console.error("No plan selected for update");
        showAlert("No plan selected for update", "danger");
        return;
    }
    const editCategoryElement = document.getElementById('editCategory');
    if (!editCategoryElement || !editCategoryElement.value) {
        showAlert("Please select a category", "warning");
        return;
    }
    const categoryId = parseInt(editCategoryElement.value);
    if (isNaN(categoryId)) {
        showAlert("Invalid category selection", "warning");
        return;
    }
    console.log("Looking for category with ID:", categoryId);
    console.log("Available categories:", categoriesData);
    const categoryObj = categoriesData.find(c => c.id == categoryId);
    if (!categoryObj) {
        console.error(`Category with ID ${categoryId} not found in local data`);
        showAlert("Selected category not found. Try refreshing the page.", "warning");
        return;
    }
    const updatedPlan = {
        planId: selectedPlan.id,
        categoryId: categoryId,
        categoryName: categoryObj.name,
        planName: selectedPlan.planName || 'Updated Plan',
        price: parseFloat(document.getElementById('editPrice').value),
        data: document.getElementById('editData').value,
        validity: document.getElementById('editValidity').value,
        calls: document.getElementById('editCalls').value,
        benefits: document.getElementById('editBenefits').value,
        isActive: selectedPlan.active
    };
    console.log("Attempting to update plan:", updatedPlan);
    try {
        const response = await fetchData(`${PLANS_API_URL}/${selectedPlan.id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedPlan)
        });
        const returnedPlan = await response.json();
        console.log("Plan updated successfully:", returnedPlan);
        const frontendPlan = {
            id: returnedPlan.planId || returnedPlan.id || selectedPlan.id,
            categoryId: categoryId,
            category: categoryObj.name,
            planName: returnedPlan.planName || selectedPlan.planName || 'Updated Plan',
            price: returnedPlan.price,
            data: returnedPlan.data,
            validity: returnedPlan.validity,
            calls: returnedPlan.calls || 'Unlimited',
            benefits: returnedPlan.benefits || 'No additional benefits',
            active: returnedPlan.isActive !== undefined ? returnedPlan.isActive : selectedPlan.active
        };
        console.log("Updated frontend plan:", frontendPlan);
        const index = plansData.findIndex(p => p.id === selectedPlan.id);
        if (index !== -1) {
            plansData[index] = frontendPlan;
        }
        closeModal(editPlanModal);
        renderTable();
        showAlert(`${frontendPlan.category} plan has been updated`, 'success');
    } catch (error) {
        console.error("Error updating plan:", error);
        showAlert("Failed to update plan in the database. Please check the server connection and try again.", "danger");
    }
}

// Show modal to create a new category
function showNewCategoryModal(selectElement) {
    console.log("Opening new category modal");
    let categoryModal = document.getElementById('newCategoryModal');
    let newCategoryModal;
    if (!categoryModal) {
        console.log("Creating new category modal");
        const modalHTML = `
        <div class="modal fade" id="newCategoryModal" tabindex="-1" aria-labelledby="newCategoryModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content glass-effect">
                    <div class="modal-header">
                        <h5 class="modal-title" id="newCategoryModalLabel">Add New Category</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="newCategoryForm">
                            <div class="mb-3">
                                <label for="newCategoryName" class="form-label">Category Name</label>
                                <input type="text" class="form-control" id="newCategoryName" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="cancelNewCategory">Cancel</button>
                        <button type="button" class="btn btn-primary" id="saveNewCategory">Save Category</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        categoryModal = document.getElementById('newCategoryModal');
        newCategoryModal = new bootstrap.Modal(categoryModal);
        document.getElementById('saveNewCategory').addEventListener('click', function() {
            saveNewCategory(selectElement);
        });
        document.getElementById('cancelNewCategory').addEventListener('click', function() {
            if (selectElement) {
                selectElement.value = "";
            }
        });
    } else {
        newCategoryModal = new bootstrap.Modal(categoryModal);
    }
    const form = document.getElementById('newCategoryForm');
    if (form) form.reset();
    newCategoryModal.show();
    console.log("New category modal shown");
}

// Save a new category to the database
async function saveNewCategory(selectElement) {
    const categoryNameInput = document.getElementById('newCategoryName');
    if (!categoryNameInput || !categoryNameInput.value.trim()) {
        showAlert("Please enter a category name", "warning");
        return;
    }
    const newCategoryName = categoryNameInput.value.trim();
    console.log(`Attempting to save new category: ${newCategoryName}`);
    try {
        const newCategory = { categoryName: newCategoryName };
        // Use the appropriate endpoint for admin operations
        const response = await fetchData(ADMIN_CATEGORIES_API_URL, {
            method: 'POST',
            body: JSON.stringify(newCategory)
        });
        const createdCategory = await response.json();
        console.log("New category created:", createdCategory);
        const categoryForDropdown = {
            id: createdCategory.categoryId,
            name: createdCategory.categoryName
        };
        console.log("Category for dropdown:", categoryForDropdown);
        categoriesData.push(categoryForDropdown);
        const modal = bootstrap.Modal.getInstance(document.getElementById('newCategoryModal'));
        if (modal) {
            closeModal(modal);
        }
        populateCategoryDropdowns();
        if (selectElement) {
            console.log("Setting selectElement value to:", categoryForDropdown.id);
            setTimeout(() => {
                selectElement.value = categoryForDropdown.id;
                const event = new Event('change', { bubbles: true });
                selectElement.dispatchEvent(event);
            }, 200);
        }
        showAlert(`New category "${newCategoryName}" created successfully`, "success");
    } catch (error) {
        console.error("Error creating new category:", error);
        showAlert("Failed to create category in the database. Please check the server connection and try again.", "danger");
    }
}

// Show alert notification
function showAlert(message, type) {
    console.log(`[Alert - ${type}]: ${message}`);

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    alertsContainer.appendChild(alertDiv);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    }, 5000);
}

// Logout function to clear token and redirect to login
function logout() {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'Login.html';
}

// Make functions available globally
window.openAddPlanModal = openAddPlanModal;
window.openEditModal = openEditModal;
window.savePlan = savePlan;
window.updatePlan = updatePlan;
window.togglePlanStatus = togglePlanStatus;
window.logout = logout;
window.showNewCategoryModal = showNewCategoryModal;
window.loginAsAdmin = loginAsAdmin;