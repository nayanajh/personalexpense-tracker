/**
 * SpendFlow - Authentication & Welcome Page Script
 * Powers welcome.html, register.html, and login.html.
 * Seamlessly interfaces with Spring Boot REST API (/api/auth/login, /api/auth/register)
 * with automatic fallback to browser LocalStorage when running offline.
 */

document.addEventListener("DOMContentLoaded", () => {
    async function clearStoredSession() {
        if (localStorage.getItem("spendflow_auth_mode") === "server") {
            const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
            if (!response.ok) throw new Error(`Sign-out failed (${response.status}).`);
        }
        localStorage.removeItem("spendflow_user");
        localStorage.removeItem("spendflow_auth_mode");
    }

    // Set current year in footers
    const yearEl = document.getElementById("auth-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Elements
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const authAlertBox = document.getElementById("auth-alert-box");
    const demoLoginBtn = document.getElementById("demo-login-btn");

    // Inputs - Login
    const loginEmail = document.getElementById("login-email");
    const loginPassword = document.getElementById("login-password");

    // Inputs - Register
    const registerName = document.getElementById("register-name");
    const registerEmail = document.getElementById("register-email");
    const registerBudget = document.getElementById("register-budget");
    const registerPassword = document.getElementById("register-password");
    const registerConfirmPassword = document.getElementById("register-confirm-password");
    const registerTerms = document.getElementById("register-terms");

    // Password Strength & Match Elements
    const strengthBarFill = document.getElementById("strength-bar-fill");
    const strengthBadge = document.getElementById("strength-badge");
    const passwordMatchTag = document.getElementById("password-match-tag");

    // -------------------------------------------------------------
    // WELCOME PAGE DYNAMIC USER STATE
    // -------------------------------------------------------------
    const currentUserRaw = localStorage.getItem("spendflow_user");
    if (currentUserRaw) {
        try {
            const currentUser = JSON.parse(currentUserRaw);
            const displayName = currentUser.username || currentUser.fullName || "User";
            const welcomeHeaderActions = document.getElementById("welcome-header-actions");
            if (welcomeHeaderActions) {
                welcomeHeaderActions.innerHTML = `
                    <span style="font-size: 0.9rem; font-weight: 700; color: var(--primary-700); display: flex; align-items: center; gap: 0.4rem;">
                        <i class="fa-solid fa-circle-user"></i> Hi, ${escapeHtml(displayName)}
                    </span>
                    <a href="index.html" class="btn btn-primary btn-sm">
                        <i class="fa-solid fa-chart-line"></i>
                        <span>Go to Dashboard</span>
                    </a>
                    <button type="button" class="btn btn-ghost btn-sm" id="welcome-signout-btn" title="Sign out of account">
                        <i class="fa-solid fa-right-from-bracket"></i>
                        <span>Sign Out</span>
                    </button>
                `;
                const soBtn = document.getElementById("welcome-signout-btn");
                if (soBtn) {
                    soBtn.addEventListener("click", async () => {
                        try {
                            await clearStoredSession();
                        } catch (error) {
                            console.error("Could not end the server session:", error);
                            showAlert("Could not sign out from your server account. Please try again.", "error");
                            return;
                        }
                        window.location.reload();
                    });
                }
            }
            const heroCta = document.getElementById("welcome-hero-cta");
            if (heroCta) {
                heroCta.innerHTML = `
                    <a href="index.html" class="btn btn-primary btn-lg">
                        <i class="fa-solid fa-chart-line"></i>
                        <span>Continue to Dashboard (${escapeHtml(displayName)}) &rarr;</span>
                    </a>
                    <button type="button" class="btn btn-ghost btn-lg" id="hero-switch-user-btn">
                        <i class="fa-solid fa-user-plus"></i>
                        <span>Switch User / Register New</span>
                    </button>
                `;
                const suBtn = document.getElementById("hero-switch-user-btn");
                if (suBtn) {
                    suBtn.addEventListener("click", async () => {
                        try {
                            await clearStoredSession();
                        } catch (error) {
                            console.error("Could not end the server session:", error);
                            showAlert("Could not switch accounts because sign-out failed. Please try again.", "error");
                            return;
                        }
                        window.location.href = "register.html";
                    });
                }
            }
        } catch (e) {
            localStorage.removeItem("spendflow_user");
        }
    }

    // -------------------------------------------------------------
    // PASSWORD VISIBILITY TOGGLES
    // -------------------------------------------------------------
    document.querySelectorAll(".password-toggle-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const wrapper = btn.closest(".input-wrapper");
            if (!wrapper) return;
            const input = wrapper.querySelector("input");
            const icon = btn.querySelector("i");
            if (input && icon) {
                if (input.type === "password") {
                    input.type = "text";
                    icon.className = "fa-regular fa-eye-slash";
                } else {
                    input.type = "password";
                    icon.className = "fa-regular fa-eye";
                }
            }
        });
    });

    // -------------------------------------------------------------
    // REAL-TIME PASSWORD STRENGTH CALCULATOR
    // -------------------------------------------------------------
    if (registerPassword && strengthBarFill && strengthBadge) {
        registerPassword.addEventListener("input", () => {
            const val = registerPassword.value;
            if (!val) {
                strengthBarFill.className = "strength-bar-fill";
                strengthBarFill.style.width = "0%";
                strengthBadge.textContent = "Enter password";
                strengthBadge.className = "strength-badge";
                checkPasswordMatch();
                return;
            }

            let score = 0;
            if (val.length >= 4) score += 1;
            if (val.length >= 8) score += 1;
            if (/[0-9]/.test(val)) score += 1;
            if (/[A-Z]/.test(val) || /[^A-Za-z0-9]/.test(val)) score += 1;

            if (score <= 1) {
                strengthBarFill.className = "strength-bar-fill weak";
                strengthBadge.textContent = "Weak";
                strengthBadge.className = "strength-badge weak";
            } else if (score <= 3) {
                strengthBarFill.className = "strength-bar-fill medium";
                strengthBadge.textContent = "Medium";
                strengthBadge.className = "strength-badge medium";
            } else {
                strengthBarFill.className = "strength-bar-fill strong";
                strengthBadge.textContent = "Strong ✨";
                strengthBadge.className = "strength-badge strong";
            }

            checkPasswordMatch();
        });
    }

    // -------------------------------------------------------------
    // REAL-TIME PASSWORD MATCH CHECKER
    // -------------------------------------------------------------
    if (registerConfirmPassword) {
        registerConfirmPassword.addEventListener("input", checkPasswordMatch);
    }

    function checkPasswordMatch() {
        if (!registerPassword || !registerConfirmPassword || !passwordMatchTag) return;
        const pass = registerPassword.value;
        const confirm = registerConfirmPassword.value;

        if (!confirm) {
            passwordMatchTag.classList.add("hidden");
            passwordMatchTag.innerHTML = "";
            return;
        }

        passwordMatchTag.classList.remove("hidden");
        if (pass === confirm) {
            passwordMatchTag.className = "password-match-tag match";
            passwordMatchTag.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Passwords match</span>`;
        } else {
            passwordMatchTag.className = "password-match-tag mismatch";
            passwordMatchTag.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>Passwords do not match</span>`;
        }
    }

    // -------------------------------------------------------------
    // REGISTRATION FORM SUBMISSION
    // -------------------------------------------------------------
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideAlert();

            const username = registerName ? registerName.value.trim() : "";
            const email = registerEmail ? registerEmail.value.trim() : "";
            const password = registerPassword ? registerPassword.value : "";
            const confirmPassword = registerConfirmPassword ? registerConfirmPassword.value : "";
            const initialBudget = registerBudget ? parseFloat(registerBudget.value) : 25000;

            if (!username || !email || !password || !confirmPassword) {
                showAlert("Please enter your username, email, and password.", "error");
                return;
            }

            if (password.length < 4) {
                showAlert("Password must be at least 4 characters long.", "error");
                return;
            }

            if (password !== confirmPassword) {
                showAlert("Passwords do not match. Please re-enter.", "error");
                return;
            }

            if (registerTerms && !registerTerms.checked) {
                showAlert("Please accept the terms and guidelines to proceed.", "error");
                return;
            }

            const submitBtn = document.getElementById("register-submit-btn");
            const originalText = submitBtn ? submitBtn.innerHTML : "";
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...`;
            }

            // Save user chosen initial budget and start with clean expense slate
            localStorage.removeItem("spendflow_expenses");
            if (initialBudget && !isNaN(initialBudget) && initialBudget > 0) {
                localStorage.setItem("spendflow_budget", initialBudget.toString());
                localStorage.setItem(`spendflow_budget:${encodeURIComponent(email.trim().toLowerCase())}`, initialBudget.toString());
            }

            // 1. Attempt Spring Boot Backend Registration
            try {
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fullName: username, username: username, email: email, password: password })
                });

                if (res.ok) {
                    const userData = await res.json().catch(() => ({}));
                    try {
                        const budgetResponse = await fetch("/api/budget", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ amount: initialBudget || 25000, currency: "₹" })
                        });
                        if (!budgetResponse.ok) {
                            showAlert("Account created, but the starting budget could not be saved. You can set it from your dashboard.", "warning");
                        }
                    } catch (error) {
                        console.error("Could not save the initial account budget:", error);
                        showAlert("Account created, but the starting budget could not be saved. You can set it from your dashboard.", "warning");
                    }
                    loginSuccess(userData.fullName || username, email, "Account created successfully!", "server");
                    return;
                } else {
                    const data = await res.json().catch(() => ({}));
                    if (data.error) {
                        showAlert(data.error, "error");
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = originalText;
                        }
                        return;
                    }
                }
            } catch (err) {
                console.info("Spring Boot backend offline; falling back to browser storage.", err);
            }

            // 2. Offline / LocalStorage Registration Fallback
            const registeredUsers = JSON.parse(localStorage.getItem("spendflow_registered_users") || "[]");
            const exists = registeredUsers.some(u => 
                (u.email && u.email.toLowerCase() === email.toLowerCase()) ||
                (u.username && u.username.toLowerCase() === username.toLowerCase()) ||
                (u.fullName && u.fullName.toLowerCase() === username.toLowerCase())
            );

            if (exists) {
                showAlert("An account with this email or username already exists. Please sign in.", "error");
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
                return;
            }

            // Save new user locally
            registeredUsers.push({
                username,
                fullName: username,
                email,
                password,
                initialBudget: initialBudget || 25000,
                registeredAt: new Date().toISOString()
            });
            localStorage.setItem("spendflow_registered_users", JSON.stringify(registeredUsers));

            loginSuccess(username, email, "Account registered successfully!");
        });
    }

    // -------------------------------------------------------------
    // LOGIN FORM SUBMISSION
    // -------------------------------------------------------------
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideAlert();

            const identifier = loginEmail ? loginEmail.value.trim() : "";
            const password = loginPassword ? loginPassword.value : "";

            if (!identifier || !password) {
                showAlert("Please enter your email or username and password.", "error");
                return;
            }

            const submitBtn = document.getElementById("login-submit-btn");
            const originalText = submitBtn ? submitBtn.innerHTML : "";
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Signing In...`;
            }

            // 1. Attempt Spring Boot Backend Login
            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: identifier, username: identifier, password: password })
                });

                if (res.ok) {
                    const userData = await res.json().catch(() => ({}));
                    loginSuccess(userData.fullName || identifier.split("@")[0], userData.email || identifier, "Signed in successfully!", "server");
                    return;
                } else if (res.status === 401 || res.status === 400) {
                    const data = await res.json().catch(() => ({}));
                    showAlert(data.error || "Invalid username/email or password.", "error");
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }
                    return;
                }
            } catch (err) {
                // Backend offline, fallback to local storage
                console.info("Spring Boot backend offline; falling back to browser storage.", err);
            }

            // 2. Offline / LocalStorage Verification
            const registeredUsers = JSON.parse(localStorage.getItem("spendflow_registered_users") || "[]");
            const found = registeredUsers.find(u => 
                ((u.email && u.email.toLowerCase() === identifier.toLowerCase()) || 
                 (u.username && u.username.toLowerCase() === identifier.toLowerCase()) ||
                 (u.fullName && u.fullName.toLowerCase() === identifier.toLowerCase())) && 
                u.password === password
            );

            if (found) {
                loginSuccess(found.username || found.fullName, found.email, "Welcome back!");
            } else if (identifier.toLowerCase() === "demo@spendflow.com" && password === "demo123") {
                loginSuccess("Demo User", identifier, "Welcome back!");
            } else if (registeredUsers.some(u => (u.email && u.email.toLowerCase() === identifier.toLowerCase()) || (u.username && u.username.toLowerCase() === identifier.toLowerCase()))) {
                showAlert("Incorrect password. Please verify and try again.", "error");
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            } else {
                loginSuccess(identifier.split("@")[0], identifier, "Welcome to SpendFlow!");
            }
        });
    }

    // -------------------------------------------------------------
    // QUICK 1-CLICK DEMO LOGIN BUTTON
    // -------------------------------------------------------------
    if (demoLoginBtn) {
        demoLoginBtn.addEventListener("click", () => {
            loginSuccess("Nayana", "nayana@spendflow.com", "Demo Access Granted!");
        });
    }

    // -------------------------------------------------------------
    // SUCCESS & NOTIFICATION HELPERS
    // -------------------------------------------------------------
    function loginSuccess(name, email, message = "Success!", authMode = "local") {
        const user = {
            username: name,
            fullName: name,
            email: email,
            loginAt: new Date().toISOString()
        };
        localStorage.setItem("spendflow_user", JSON.stringify(user));
        localStorage.setItem("spendflow_auth_mode", authMode);
        sessionStorage.removeItem("spendflow_guest");
        showAlert(`${message} Redirecting to your dashboard...`, "success");

        // Display smooth toast if toast container exists
        showToast(`Welcome, ${name}! Taking you to your dashboard...`, "success");

        setTimeout(() => {
            window.location.href = "index.html";
        }, 750);
    }

    function showAlert(message, type = "error") {
        if (!authAlertBox) {
            showToast(message, type);
            return;
        }
        authAlertBox.className = `auth-alert alert-${type}`;
        authAlertBox.innerHTML = `
            <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
            <span>${escapeHtml(message)}</span>
        `;
        authAlertBox.classList.remove("hidden");
    }

    function hideAlert() {
        if (authAlertBox) {
            authAlertBox.classList.add("hidden");
        }
    }

    function showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        const iconClass = type === "success" ? "fa-circle-check" : type === "warning" ? "fa-triangle-exclamation" : "fa-circle-info";

        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${escapeHtml(message)}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("toast-out");
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    function escapeHtml(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
