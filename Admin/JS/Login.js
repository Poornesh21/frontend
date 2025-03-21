// login.js - Admin login authentication with improved security

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordField = document.getElementById('password');
    const usernameField = document.getElementById('username');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');
    const API_BASE_URL = 'http://localhost:8080'; // Change this to match your backend URL

    // Animate shapes (keeping the existing animation)
    const shapes = document.querySelectorAll('.glass-shape');
    shapes.forEach((shape, index) => {
        shape.style.animation = `float ${8 + index}s ease-in-out infinite`;
    });

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordField.setAttribute('type', type);
        this.className = type === 'password' ? 'fas fa-eye password-toggle' : 'fas fa-eye-slash password-toggle';
    });

    // Show error message function
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';

        // Hide after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Form submission
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
            // Prepare the login data
            const loginData = {
                username: username,
                password: password
            };

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

                // Check if user has admin role
                if (data.roles && data.roles.includes('ROLE_ADMIN')) {
                    // Store JWT token and user information in sessionStorage instead of localStorage
                    sessionStorage.setItem('token', data.token);
                    sessionStorage.setItem('user', JSON.stringify({
                        username: data.username,
                        roles: data.roles
                    }));

                    // Redirect to admin dashboard
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
});