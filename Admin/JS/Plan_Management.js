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
function safelyCloseModal(modalElement) {
    try {
        // Try to get modal instance
        let modalInstance = bootstrap.Modal.getInstance(modalElement);

        // If no instance exists yet, create one
        if (!modalInstance) {
            modalInstance = new bootstrap.Modal(modalElement);
        }

        // Hide the modal
        modalInstance.hide();

        // Clean up backdrop and body classes
        setTimeout(() => {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();

            document.body.classList.remove('modal-open');
            document.body.style.paddingRight = '';
            document.body.style.overflow = '';
        }, 300);
    } catch (e) {
        console.error("Error closing modal:", e);
        // Fallback approach
        if (modalElement) {
            modalElement.classList.remove('show');
            modalElement.style.display = 'none';

            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();

            document.body.classList.remove('modal-open');
            document.body.style.paddingRight = '';
            document.body.style.overflow = '';
        }
    }
}

// Improved fetch wrapper with authentication
async function fetchWithAuth(url, options = {}) {
    // Get token from both localStorage and sessionStorage (for compatibility)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!token) {
        console.error('No authentication token found');
        showAlert('Your session has expired. Please login again.', 'danger');
        setTimeout(() => window.location.href = 'Login.html', 2000);
        return null;
    }

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
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
        console.log(`Making ${options.method || 'GET'} request to ${url}`);
        const response = await fetch(url, mergedOptions);

        if (response.status === 401) {
            console.error('Authentication token expired');
            showAlert('Your session has expired. Please login again.', 'danger');
            setTimeout(() => window.location.href = 'Login.html', 2000);
            return null;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        showAlert(`Error: ${error.message}`, 'danger');
        return null;
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
                safelyCloseModal(modalElement);
            }
        });
    });

    fetchPlans();
    fetchCategories();
});

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
            sessionStorage.setItem('token', authData.token);
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
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
        if (planTableBody) {
            planTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading plans data...</span>
                        </div>
                        <p class="mt-2 mb-0">Loading plans data...</p>
                    </td>
                </tr>
            `;
        }

        console.log("Fetching plans data...");
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        if (!token) {
            showAlert('Authentication token missing. Please log in again.', 'danger');
            setTimeout(() => window.location.href = 'Login.html', 2000);
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/plans`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            showAlert('Your session has expired. Please log in again.', 'danger');
            setTimeout(() => window.location.href = 'Login.html', 2000);
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const backendPlans = await response.json();
        console.log("Raw plans data from API:", backendPlans);

        if (!Array.isArray(backendPlans)) {
            console.warn("Backend did not return an array, using empty array instead");
            plansData = [];
        } else {
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
        }

        console.log("Transformed plans data:", plansData);
        renderTable();

        if (plansData.length > 0) {
            showAlert('Plans loaded successfully', 'success', 2000);
        } else {
            showAlert('No plans found. You can add new plans.', 'info');
        }
    } catch (error) {
        console.error("Error in fetch operation:", error);
        plansData = [];
        renderTable();
        showAlert('Failed to load plans: ' + error.message, 'warning');
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

        const response = await fetch(CATEGORIES_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const categories = await response.json();
        console.log("Raw categories response:", categories);

        if (!Array.isArray(categories)) {
            console.warn("Categories API did not return an array");
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

        populateCategoryDropdowns();

        if (categoriesData.length === 0) {
            showAlert('No categories found. Please add a category first.', 'warning');
        }
    } catch (error) {
        console.error("Error fetching categories:", error);
        categoriesData = [];
        showAlert('Failed to load categories: ' + error.message, 'warning');
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
    if (!planTableBody) {
        console.error("Plan table body element not found");
        return;
    }

    planTableBody.innerHTML = '';

    console.log("Rendering table with plans:", plansData);

    if (plansData.length === 0) {
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

    // Sort plans: active first, then by price
    const sortedPlans = [...plansData].sort((a, b) => {
        if (a.active !== b.active) return b.active - a.active;
        return a.price - b.price;
    });

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

    // Initialize tooltips
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

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            showAlert('Authentication required. Please log in.', 'danger');
            setTimeout(() => window.location.href = 'Login.html', 2000);
            return;
        }

        // Call the backend PATCH endpoint for toggling the status.
        const response = await fetch(`${PLANS_API_URL}/${planId}/toggle-status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            showAlert('Your session has expired. Please log in again.', 'danger');
            setTimeout(() => window.location.href = 'Login.html', 2000);
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

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
        showAlert('Failed to update plan status: ' + error.message, 'danger');
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

    // Show loading state
    const saveButton = document.querySelector('#addPlanModal button.btn-success');
    const originalButtonText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="spinner-border spinner-border-sm"></i> Saving...';
    saveButton.disabled = true;

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
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            showAlert('Authentication required. Please log in.', 'danger');
            setTimeout(() => window.location.href = 'Login.html', 2000);
            return;
        }

        const response = await fetch(PLANS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newPlan)
        });

        if (response.status === 401) {
            showAlert('Your session has expired. Please log in again.', 'danger');
            setTimeout(() => window.location.href = 'Login.html', 2000);
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

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

        // Close modal
        safelyCloseModal(document.getElementById('addPlanModal'));
        form.reset();

        // Refresh table
        renderTable();
        showAlert(`New ${frontendPlan.category} plan has been added`, 'success');
    } catch (error) {
        console.error("Error creating plan:", error);
        showAlert("Failed to save plan: " + error.message, "danger");
    } finally {
        // Restore button state
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
    }
}

// login.js - Admin login authentication with improved security

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordField = document.getElementById('password');
    const usernameField = document.getElementById('username');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage') || createErrorMessage();
    const API_BASE_URL = 'http://localhost:8080'; // Change this to match your backend URL

    function createErrorMessage() {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.className = 'alert alert-danger mt-3 d-none';
        const formBottomArea = document.querySelector('.form-bottom') || loginForm;
        formBottomArea.parentNode.insertBefore(errorDiv, formBottomArea.nextSibling);
        return errorDiv;
    }

    // Animate shapes (keeping the existing animation)
    const shapes = document.querySelectorAll('.glass-shape');
    shapes.forEach((shape, index) => {
        shape.style.animation = `float ${8 + index}s ease-in-out infinite`;
    });

    // Toggle password visibility
    if (togglePassword && passwordField) {
        togglePassword.addEventListener('click', function() {
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            this.className = type === 'password' ? 'fas fa-eye password-toggle' : 'fas fa-eye-slash password-toggle';
        });
    }

    // Show error message function
    function showError(message) {
        if (!errorMessage) return;

        errorMessage.textContent = message;
        errorMessage.classList.remove('d-none');

        // Hide after 5 seconds
        setTimeout(() => {
            errorMessage.classList.add('d-none');
        }, 5000);
    }

    // Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = usernameField.value.trim();
            const password = passwordField.value;

            // Simple validation
            if (!username || !password) {
                showError('Please enter both username and password');
                return;
            }

            // Set button to loading state
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Logging in...';
            loginButton.disabled = true;

            try {
                // Clear any previous auth tokens
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');

                // Prepare the login data
                const loginData = {
                    username: username,
                    password: password
                };

                console.log('Attempting login with:', username);

                // Send authentication request to Spring Security JWT endpoint
                const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('Login successful', data);

                    // Check if user has admin role
                    if (data.roles && data.roles.includes('ROLE_ADMIN')) {
                        // Store JWT token in both localStorage and sessionStorage
                        localStorage.setItem('token', data.token);
                        sessionStorage.setItem('token', data.token);

                        console.log('Admin login successful, redirecting...');
                        window.location.href = 'Dashboard.html';
                    } else {
                        // If not admin, show error
                        showError('Access denied. Admin privileges required.');
                        loginButton.innerHTML = 'Login';
                        loginButton.disabled = false;
                    }
                } else {
                    // Get error message from response if available
                    try {
                        const errorData = await response.json();
                        showError(errorData.message || 'Invalid username or password');
                    } catch (e) {
                        showError('Invalid username or password');
                    }

                    loginButton.innerHTML = 'Login';
                    loginButton.disabled = false;
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('Error connecting to server. Please try again later.');
                loginButton.innerHTML = 'Login';
                loginButton.disabled = false;
            }
        });
    }
});