/**
 * SpendFlow - Personal Expense & Budget Manager
 * Connects seamlessly to Java Spring Boot REST API (/api/expenses, /api/budget)
 * with automatic fallback to browser LocalStorage when running offline.
 * Supports multi-page architecture: Dashboard, Expenses, Categories, Features, Welcome, Auth.
 */

// Let the dashboard show its sign-in/demo/guest gate; protect other pages unless in guest mode.
(function enforceAuthGuard() {
    const rawUser = localStorage.getItem("spendflow_user");
    const isGuest = sessionStorage.getItem("spendflow_guest") === "true";
    if (!rawUser && !isGuest && !isDashboardPage()) {
        window.location.replace("welcome.html");
    }
})();

function isDashboardPage() {
    const path = window.location.pathname;
    return path.endsWith("/") || path.endsWith("/index.html");
}

function getLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getScopedStorageKey(key) {
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem("spendflow_user") || "null");
    } catch (error) {
        console.error("Could not read the current local profile:", error);
    }
    const identity = user && user.email ? user.email.trim().toLowerCase() : "";
    return identity ? `${key}:${encodeURIComponent(identity)}` : key;
}

// Category Icons and Color Mapping (Purple & Harmonious Accents)
const CATEGORY_META = {
    "Food & Dining": { icon: "fa-utensils", color: "#8b5cf6", bg: "#ede9fe" },
    "Shopping & Groceries": { icon: "fa-bag-shopping", color: "#ec4899", bg: "#fce7f3" },
    "Transportation": { icon: "fa-car", color: "#3b82f6", bg: "#dbeafe" },
    "Bills & Utilities": { icon: "fa-bolt", color: "#f59e0b", bg: "#fef3c7" },
    "Entertainment": { icon: "fa-film", color: "#a855f7", bg: "#f3e8ff" },
    "Health & Medical": { icon: "fa-heart-pulse", color: "#ef4444", bg: "#fee2e2" },
    "Education": { icon: "fa-graduation-cap", color: "#06b6d4", bg: "#cffafe" },
    "Travel & Leisure": { icon: "fa-plane", color: "#14b8a6", bg: "#ccfbf1" },
    "Other": { icon: "fa-tags", color: "#6b7280", bg: "#f3f4f6" }
};

// Application State
const state = {
    expenses: [],
    budget: 0,
    currency: "₹",
    backendConnected: false,
    chartInstance: null,
    monthlyTrendChart: null,
    searchQuery: "",
    categoryFilter: "ALL",
    sortBy: "date-desc",
    lastAlertLevel: null,
    editingExpenseId: null,
    savingsGoals: [],
    categoryBudgets: {},
    categoryBudgetIds: {},
    editingCategoryBudgetId: null,
    editingCategoryBudgetCategory: null,
    sharedExpenses: [],
    notifications: [],
    authenticatedUser: null,
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedCalendarDate: getLocalDateKey(new Date()),
    statementImportRows: []
};

// DOM Elements (Dynamically loaded & guarded for multi-page support)
const elements = {
    // Stat elements
    statBudget: document.getElementById("stat-total-budget"),
    statSpent: document.getElementById("stat-total-spent"),
    statRemaining: document.getElementById("stat-remaining-balance"),
    statSpentPct: document.getElementById("stat-spent-percentage"),
    balanceCard: document.getElementById("stat-balance-card"),
    balanceStatusTag: document.getElementById("balance-status-tag"),
    progressPercent: document.getElementById("progress-percent-number"),
    progressBarFill: document.getElementById("budget-progress-fill"),
    progressCaption: document.getElementById("progress-status-caption"),

    // Budget alert banner & Risk Level Hub
    alertBanner: document.getElementById("budget-alert-banner"),
    alertTitle: document.getElementById("alert-title"),
    alertMessage: document.getElementById("alert-message"),
    alertCloseBtn: document.getElementById("close-alert-btn"),
    riskBadge: document.getElementById("risk-badge"),
    riskScore: document.getElementById("risk-score"),
    enableNotificationsBtn: document.getElementById("enable-notifications-btn"),
    riskLevelPill: document.getElementById("risk-level-pill"),

    // Form elements
    expenseForm: document.getElementById("expense-form"),
    inputTitle: document.getElementById("expense-title"),
    inputAmount: document.getElementById("expense-amount"),
    inputCategory: document.getElementById("expense-category"),
    inputDate: document.getElementById("expense-date"),
    inputPayment: document.getElementById("expense-payment"),
    submitExpenseBtn: document.getElementById("submit-expense-btn"),
    cancelExpenseEditBtn: document.getElementById("cancel-expense-edit-btn"),
    expenseFormTitle: document.getElementById("expense-form-title"),
    receiptImageInput: document.getElementById("receipt-image-input"),
    scanReceiptBtn: document.getElementById("scan-receipt-btn"),
    receiptScanStatus: document.getElementById("receipt-scan-status"),
    currencyPrefix: document.getElementById("form-currency-prefix"),

    // List and filter elements
    expenseList: document.getElementById("expense-list"),
    emptyState: document.getElementById("empty-state"),
    visibleCount: document.getElementById("visible-expense-count"),
    totalCount: document.getElementById("total-expense-count"),
    filteredTotal: document.getElementById("filtered-total-amount"),
    searchInput: document.getElementById("search-input"),
    clearSearchBtn: document.getElementById("clear-search-btn"),
    categoryFilter: document.getElementById("category-filter"),
    sortSelect: document.getElementById("sort-select"),

    // Analytics elements
    categoryChartCanvas: document.getElementById("category-chart"),
    chartEmptyState: document.getElementById("chart-empty-state"),
    categoryBarsContainer: document.getElementById("category-bars-container"),
    monthlyTrendCanvas: document.getElementById("monthly-trends-chart"),
    monthlyTrendEmptyState: document.getElementById("monthly-trends-empty-state"),
    monthlyTrendSummary: document.getElementById("monthly-trends-summary"),
    categoryBudgetForm: document.getElementById("category-budget-form"),
    categoryBudgetCategory: document.getElementById("category-budget-category"),
    categoryBudgetAmount: document.getElementById("category-budget-amount"),
    categoryBudgetCurrency: document.getElementById("category-budget-currency"),
    categoryBudgetsList: document.getElementById("category-budgets-list"),
    categoryBudgetsEmpty: document.getElementById("category-budgets-empty"),
    calendarPreviousBtn: document.getElementById("calendar-prev-month"),
    calendarNextBtn: document.getElementById("calendar-next-month"),
    calendarTodayBtn: document.getElementById("calendar-today-btn"),
    calendarMonthLabel: document.getElementById("calendar-month-label"),
    calendarMonthTotal: document.getElementById("calendar-month-total"),
    spendingCalendarGrid: document.getElementById("spending-calendar-grid"),
    calendarSelectedDate: document.getElementById("calendar-selected-date"),
    calendarDayExpenses: document.getElementById("calendar-day-expenses"),

    // Modals & Controls
    budgetModal: document.getElementById("budget-modal"),
    budgetForm: document.getElementById("budget-form"),
    budgetInput: document.getElementById("budget-input"),
    openBudgetModalBtn: document.getElementById("open-budget-modal-btn"),
    quickEditBudgetBtn: document.getElementById("quick-edit-budget"),
    closeBudgetModalBtn: document.getElementById("close-budget-modal-btn"),
    cancelBudgetModalBtn: document.getElementById("cancel-budget-modal-btn"),
    modalCurrencySymbol: document.getElementById("modal-currency-symbol"),
    budgetCurrencyPrefix: document.getElementById("budget-currency-prefix"),

    confirmModal: document.getElementById("confirm-modal"),
    clearAllBtn: document.getElementById("clear-all-btn"),
    cancelConfirmBtn: document.getElementById("cancel-confirm-btn"),
    closeConfirmModalBtn: document.getElementById("close-confirm-modal-btn"),
    confirmClearAllBtn: document.getElementById("confirm-clear-all-btn"),

    currencySelect: document.getElementById("currency-select"),
    exportCsvBtn: document.getElementById("export-csv-btn"),
    toastContainer: document.getElementById("toast-container"),
    currentYear: document.getElementById("current-year"),
    savingsGoalForm: document.getElementById("savings-goal-form"),
    goalNameInput: document.getElementById("goal-name"),
    goalTargetInput: document.getElementById("goal-target"),
    goalSavedInput: document.getElementById("goal-saved"),
    goalCurrencySymbol: document.getElementById("goal-currency-symbol"),
    goalCurrencySymbolCopy: document.getElementById("goal-currency-symbol-copy"),
    goalDeadlineInput: document.getElementById("goal-deadline"),
    savingsGoalsList: document.getElementById("savings-goals-list"),
    savingsGoalsEmpty: document.getElementById("savings-goals-empty"),
    unusualSpendingContent: document.getElementById("unusual-spending-content"),
    forecastContent: document.getElementById("forecast-content"),
    financialHealthContent: document.getElementById("financial-health-content"),
    notificationList: document.getElementById("in-app-notifications-list"),
    notificationStorageNote: document.getElementById("notification-storage-note"),
    refreshNotificationsBtn: document.getElementById("refresh-notifications-btn"),
    sharedSplitForm: document.getElementById("shared-split-form"),
    sharedSplitExpense: document.getElementById("shared-split-expense"),
    sharedSplitPeople: document.getElementById("shared-split-people"),
    sharedSplitsList: document.getElementById("shared-splits-list")
};

// ==========================================================================
// Initialization & Backend Sync
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    setupResponsiveNavigation();
    setupConnectionStatus();

    // Set current year in footer
    if (elements.currentYear) {
        elements.currentYear.textContent = new Date().getFullYear();
    }

    // Set today's date in expense date input if present
    if (elements.inputDate) {
        const today = new Date().toISOString().split("T")[0];
        elements.inputDate.value = today;
    }

    // Load user preferences from LocalStorage
    loadPreferences();

    // Check backend status and fetch data
    await checkBackendAndLoadData();

    // Setup event listeners
    initEventListeners();

    // Initialize user profile header widget
    initUserProfile();

    // Check auth on dashboard: prompt for sign in or register if not logged in
    checkAuthOnDashboard();

    // Initial render across all views
    renderAll();
});

function setupResponsiveNavigation() {
    const header = document.querySelector(".app-header");
    const headerContainer = header && header.querySelector(".header-container");
    const mainNav = headerContainer && headerContainer.querySelector(".app-main-nav");
    if (!header || !headerContainer || !mainNav || document.getElementById("app-sidebar")) return;

    const sidebar = document.createElement("aside");
    sidebar.id = "app-sidebar";
    sidebar.className = "app-sidebar";
    sidebar.setAttribute("aria-label", "Application navigation");
    sidebar.innerHTML = `
        <div class="sidebar-brand">
            <a href="index.html" aria-label="SpendFlow dashboard">
                <span class="sidebar-brand-icon"><i class="fa-solid fa-wallet"></i></span>
                <span class="sidebar-brand-name">Spend<span>Flow</span></span>
            </a>
            <button type="button" class="sidebar-collapse-btn" id="sidebar-collapse-btn" aria-label="Collapse navigation" aria-expanded="true" title="Collapse navigation">
                <i class="fa-solid fa-angles-left"></i>
            </button>
        </div>
    `;
    sidebar.appendChild(mainNav);
    document.body.prepend(sidebar);

    const mobileNav = mainNav.cloneNode(true);
    mobileNav.className = "mobile-bottom-nav";
    mobileNav.setAttribute("aria-label", "Mobile navigation");
    mobileNav.querySelectorAll("a").forEach(link => {
        link.removeAttribute("title");
        link.setAttribute("aria-label", link.textContent.trim());
    });
    document.body.appendChild(mobileNav);

    const collapseButton = sidebar.querySelector("#sidebar-collapse-btn");
    const collapsed = localStorage.getItem("spendflow_sidebar_collapsed") === "true";
    document.body.classList.toggle("app-sidebar-collapsed", collapsed);
    collapseButton.setAttribute("aria-expanded", String(!collapsed));
    collapseButton.title = collapsed ? "Expand navigation" : "Collapse navigation";
    collapseButton.setAttribute("aria-label", collapseButton.title);
    collapseButton.addEventListener("click", () => {
        const isCollapsed = document.body.classList.toggle("app-sidebar-collapsed");
        localStorage.setItem("spendflow_sidebar_collapsed", String(isCollapsed));
        collapseButton.setAttribute("aria-expanded", String(!isCollapsed));
        collapseButton.title = isCollapsed ? "Expand navigation" : "Collapse navigation";
        collapseButton.setAttribute("aria-label", collapseButton.title);
        collapseButton.innerHTML = `<i class="fa-solid ${isCollapsed ? "fa-angles-right" : "fa-angles-left"}"></i>`;
    });

}

function setupConnectionStatus() {
    const refreshStatus = () => {
        const badge = document.getElementById("backend-status-badge");
        if (!badge) return;
        if (!navigator.onLine) {
            badge.classList.add("connection-offline");
            badge.setAttribute("aria-label", "Offline. Browser-saved data only; not synced.");
            badge.title = "Offline. Changes are saved only in this browser and will not sync to MySQL until you reconnect and reload.";
            badge.innerHTML = '<span class="status-dot offline"></span> Offline · Local data';
            return;
        }
        badge.classList.remove("connection-offline");
        if (state.backendConnected) {
            badge.setAttribute("aria-label", "Connected to the shared SpendFlow account database.");
            badge.title = "Connected to the account’s Spring Boot backend and shared MySQL database.";
        } else {
            badge.innerHTML = '<span class="status-dot offline"></span> Online · Local only';
            badge.setAttribute("aria-label", "Online, but browser-local mode is active.");
            badge.title = "The network is available, but this page is using browser storage. Reload after signing in to sync with your account.";
        }
    };
    window.addEventListener("online", () => {
        refreshStatus();
        showToast("Connection restored. Reload to sync with your account.", "info");
    });
    window.addEventListener("offline", () => {
        if (state.backendConnected) {
            state.backendConnected = false;
            saveToLocalStorage();
            saveLocalCollection("spendflow_savings_goals", state.savingsGoals);
            saveLocalCollection("spendflow_category_budgets", state.categoryBudgets);
            saveLocalCollection("spendflow_shared_expenses", state.sharedExpenses);
            saveLocalCollection("spendflow_notifications", state.notifications);
        }
        refreshStatus();
        showToast("You’re offline. Changes will stay on this device and will not sync automatically.", "warning");
    });
    refreshStatus();
}

// Check auth on dashboard load - prompts for Sign In or Login if not authenticated
function checkAuthOnDashboard() {
    const authGateModal = document.getElementById("auth-gate-modal");
    if (!authGateModal) return;

    const rawUser = localStorage.getItem("spendflow_user");
    if (!rawUser && sessionStorage.getItem("spendflow_guest") !== "true") {
        // Show Sign In or Register prompt
        authGateModal.classList.remove("hidden");
    } else {
        authGateModal.classList.add("hidden");
    }

    // Quick Demo Button
    const demoBtn = document.getElementById("gate-demo-btn");
    if (demoBtn && !demoBtn.dataset.bound) {
        demoBtn.dataset.bound = "true";
        demoBtn.addEventListener("click", () => {
            const demoUser = {
                fullName: "Nayana",
                email: "nayana@spendflow.com",
                loginAt: new Date().toISOString()
            };
            localStorage.setItem("spendflow_user", JSON.stringify(demoUser));
            sessionStorage.removeItem("spendflow_guest");
            authGateModal.classList.add("hidden");
            initUserProfile();
            showToast("Welcome, Nayana! Demo access enabled.", "success");
        });
    }

    // Continue as Guest Button
    const guestBtn = document.getElementById("gate-guest-btn");
    if (guestBtn && !guestBtn.dataset.bound) {
        guestBtn.dataset.bound = "true";
        guestBtn.addEventListener("click", () => {
            sessionStorage.setItem("spendflow_guest", "true");
            authGateModal.classList.add("hidden");
            showToast("Exploring in Guest Mode.", "info");
        });
    }
}

// Initialize User Profile widget from login session
function initUserProfile() {
    const profileWidget = document.getElementById("user-profile-widget");
    const avatarEl = document.getElementById("user-profile-avatar");
    const nameEl = document.getElementById("user-profile-name");
    const logoutBtn = document.getElementById("user-logout-btn");

    if (!profileWidget || !avatarEl || !nameEl) return;

    const rawUser = localStorage.getItem("spendflow_user");
    if (rawUser) {
        try {
            const user = JSON.parse(rawUser);
            const name = user.username || user.fullName || "User";
            nameEl.textContent = name;
            avatarEl.textContent = name.charAt(0).toUpperCase();
            if (logoutBtn) {
                logoutBtn.title = `Sign Out (${name})`;
            }
        } catch (e) {
            window.location.replace("welcome.html");
            return;
        }
    } else if (sessionStorage.getItem("spendflow_guest") === "true" || isDashboardPage()) {
        nameEl.textContent = "Guest";
        avatarEl.textContent = "G";
        if (logoutBtn) logoutBtn.title = "Exit guest mode";
    } else {
        window.location.replace("welcome.html");
        return;
    }

    if (logoutBtn && !logoutBtn.dataset.bound) {
        logoutBtn.dataset.bound = "true";
        logoutBtn.addEventListener("click", async (e) => {
            e.stopPropagation();

            const confirmLogout = window.confirm("Are you sure you want to log out and return to the welcome page?");
            if (!confirmLogout) {
                return;
            }

            if (localStorage.getItem("spendflow_auth_mode") === "server") {
                try {
                    const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
                    if (!response.ok) throw new Error(`Sign-out failed (${response.status}).`);
                } catch (error) {
                    console.error("Could not end the server session:", error);
                    showToast("Could not sign out from your server account. Please try again.", "error");
                    return;
                }
            }
            localStorage.removeItem("spendflow_user");
            localStorage.removeItem("spendflow_auth_mode");
            sessionStorage.removeItem("spendflow_guest");
            showToast("Signed out successfully", "info");
            setTimeout(() => {
                window.location.replace("welcome.html");
            }, 300);
        });
    }

    if (!profileWidget.dataset.bound) {
        profileWidget.dataset.bound = "true";
        profileWidget.addEventListener("click", () => {
            if (!localStorage.getItem("spendflow_user")) {
                const modal = document.getElementById("auth-gate-modal");
                if (modal) {
                    modal.classList.remove("hidden");
                } else {
                    window.location.href = "login.html";
                }
            }
        });
    }
}

// Load preferences (currency & saved budget if any)
function loadPreferences() {
    let savedCurrency = localStorage.getItem("spendflow_currency");
    // Switch to Rupees if not set or was previously USD ($)
    if (!savedCurrency || savedCurrency === "$") {
        savedCurrency = "₹";
        localStorage.setItem("spendflow_currency", "₹");
    }
    state.currency = savedCurrency;
    if (elements.currencySelect) {
        elements.currencySelect.value = savedCurrency;
    }
    updateCurrencyDisplays();

    const budgetKey = getScopedStorageKey("spendflow_budget");
    const configuredKey = getScopedStorageKey("spendflow_budget_configured");
    let savedBudget = localStorage.getItem(budgetKey);
    const hasAccountScope = budgetKey !== "spendflow_budget";
    if (savedBudget === "25000" && !hasAccountScope &&
        localStorage.getItem(configuredKey) !== "true") {
        localStorage.removeItem(budgetKey);
        savedBudget = null;
    }
    const parsedBudget = Number(savedBudget);
    state.budget = Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : 0;
    if (state.budget > 0) localStorage.setItem(configuredKey, "true");
}

// Connect to Java backend if available, otherwise fallback to LocalStorage
async function checkBackendAndLoadData() {
    try {
        const authResponse = await fetch("/api/auth/me", { headers: { "Accept": "application/json" } });
        if (!authResponse.ok) {
            if (authResponse.status !== 401) throw new Error(`Account check failed (${authResponse.status}).`);
            if (localStorage.getItem("spendflow_auth_mode") === "server") {
                localStorage.removeItem("spendflow_user");
                localStorage.removeItem("spendflow_auth_mode");
                showToast("Your sign-in expired. Please sign in again.", "warning");
                window.location.replace("login.html");
                return;
            }
            state.backendConnected = false;
            createBackendBadge(false);
            loadFromLocalStorage();
            loadLocalFinancialData();
            if (elements.notificationStorageNote) {
                elements.notificationStorageNote.textContent = "Saved in this browser only until you sign in to a server account.";
            }
            return;
        }

        const user = await authResponse.json();
        state.authenticatedUser = user;
        localStorage.setItem("spendflow_user", JSON.stringify({
            username: user.fullName || user.email,
            fullName: user.fullName || user.email,
            email: user.email,
            loginAt: new Date().toISOString()
        }));
        localStorage.setItem("spendflow_auth_mode", "server");

        const apiGet = async url => {
            const response = await fetch(url, { headers: { "Accept": "application/json" } });
            if (!response.ok) throw new Error(`${url} returned ${response.status}.`);
            return response.json();
        };
        const [expenses, budgetData, goals, categoryBudgets, sharedExpenses, notifications] = await Promise.all([
            apiGet("/api/expenses"),
            apiGet("/api/budget/current"),
            apiGet("/api/savings-goals"),
            apiGet("/api/category-budgets"),
            apiGet("/api/shared-expenses"),
            apiGet("/api/notifications")
        ]);
        if (!Array.isArray(expenses) || !Array.isArray(goals) || !Array.isArray(categoryBudgets) ||
            !Array.isArray(sharedExpenses) || !Array.isArray(notifications)) {
            throw new Error("The server returned data in an unexpected format.");
        }
        state.backendConnected = true;
        state.expenses = expenses;
        state.budget = Number(budgetData.amount) || 0;
        state.currency = budgetData.currency || state.currency;
        state.savingsGoals = goals.map(goal => ({
            id: String(goal.id),
            name: goal.name,
            target: Number(goal.targetAmount),
            saved: Number(goal.currentAmount),
            deadline: goal.deadline || ""
        }));
        const month = getCurrentMonthKey();
        state.categoryBudgets = {};
        state.categoryBudgetIds = {};
        categoryBudgets.filter(budget => budget.monthYear === month).forEach(budget => {
            state.categoryBudgets[budget.category] = Number(budget.amount);
            state.categoryBudgetIds[budget.category] = String(budget.id);
        });
        state.sharedExpenses = sharedExpenses;
        state.notifications = notifications;
        if (elements.currencySelect) elements.currencySelect.value = state.currency;
        updateCurrencyDisplays();
        cacheAccountSnapshot();
        createBackendBadge(true);
        renderNotifications();
        await ensureUnusualSpendingNotifications();
        if (elements.notificationStorageNote) {
            elements.notificationStorageNote.textContent = "Saved securely to your account and synced across devices.";
        }
        return;
    } catch (e) {
        console.error("Could not load account data from the backend:", e);
        showToast("Could not load all account data from the server. Using this account’s local data for now.", "warning");
    }

    // Fallback: LocalStorage Mode
    state.backendConnected = false;
    createBackendBadge(false);
    loadFromLocalStorage();
    loadLocalFinancialData();
    if (elements.notificationStorageNote) {
        elements.notificationStorageNote.textContent = "Saved in this browser only while the server is unavailable.";
    }
}

function cacheAccountSnapshot() {
    try {
        localStorage.setItem(getScopedStorageKey("spendflow_expenses"), JSON.stringify(state.expenses));
        localStorage.setItem(getScopedStorageKey("spendflow_budget"), String(state.budget));
        if (state.budget > 0) {
            localStorage.setItem(getScopedStorageKey("spendflow_budget_configured"), "true");
        }
        localStorage.setItem("spendflow_currency", state.currency);
        localStorage.setItem(getScopedStorageKey("spendflow_savings_goals"), JSON.stringify(state.savingsGoals));
        localStorage.setItem(getScopedStorageKey("spendflow_category_budgets"), JSON.stringify(state.categoryBudgets));
        localStorage.setItem(getScopedStorageKey("spendflow_shared_expenses"), JSON.stringify(state.sharedExpenses));
        localStorage.setItem(getScopedStorageKey("spendflow_notifications"), JSON.stringify(state.notifications));
    } catch (error) {
        console.error("Could not cache the latest account data for offline viewing:", error);
        showToast("Offline copy could not be saved in this browser. Check available storage.", "warning");
    }
}

// Add visual indicator for connection status in header
function createBackendBadge(isConnected) {
    let existingBadge = document.getElementById("backend-status-badge");
    if (!existingBadge) {
        existingBadge = document.createElement("div");
        existingBadge.id = "backend-status-badge";
        existingBadge.className = "backend-status-badge";
        const headerActions = document.querySelector(".header-actions");
        if (headerActions) {
            headerActions.prepend(existingBadge);
        }
    }

    if (isConnected) {
        const online = navigator.onLine;
        existingBadge.classList.toggle("connection-offline", !online);
        existingBadge.innerHTML = online
            ? `<span class="status-dot"></span> Shared MySQL`
            : '<span class="status-dot offline"></span> Offline · Local data';
        existingBadge.title = online
            ? "Connected to the account’s Spring Boot backend and shared MySQL database."
            : "Offline. Changes are saved only in this browser and will not sync to MySQL until you reconnect and reload.";
    } else {
        existingBadge.classList.add("connection-offline");
        existingBadge.innerHTML = navigator.onLine
            ? '<span class="status-dot offline"></span> Local Mode'
            : '<span class="status-dot offline"></span> Offline · Local data';
        existingBadge.title = "Browser storage is active. Sign in to the same account on your devices to use the shared MySQL database.";
    }
    existingBadge.setAttribute("role", "status");
}

// Load data from LocalStorage (Starts clean with 0 expenses)
function loadFromLocalStorage() {
    const storedExpenses = localStorage.getItem(getScopedStorageKey("spendflow_expenses"));
    if (storedExpenses) {
        try {
            state.expenses = JSON.parse(storedExpenses);
        } catch (e) {
            state.expenses = [];
        }
    } else {
        // Starts clean with zero expenses
        state.expenses = [];
        saveToLocalStorage();
    }
}

function saveToLocalStorage() {
    if (state.backendConnected) return;
    localStorage.setItem(getScopedStorageKey("spendflow_expenses"), JSON.stringify(state.expenses));
    localStorage.setItem(getScopedStorageKey("spendflow_budget"), state.budget.toString());
    if (state.budget > 0) {
        localStorage.setItem(getScopedStorageKey("spendflow_budget_configured"), "true");
    }
    localStorage.setItem("spendflow_currency", state.currency);
}

function loadSavingsGoals() {
    const storedGoals = localStorage.getItem(getScopedStorageKey("spendflow_savings_goals"));
    if (!storedGoals) return;

    try {
        const goals = JSON.parse(storedGoals);
        if (!Array.isArray(goals) || goals.some(goal =>
            !goal || typeof goal.id !== "string" || typeof goal.name !== "string" ||
            !Number.isFinite(Number(goal.target)) || Number(goal.target) <= 0 ||
            !Number.isFinite(Number(goal.saved)) || Number(goal.saved) < 0
        )) {
            throw new Error("Saved savings goals have an invalid format.");
        }
        state.savingsGoals = goals;
    } catch (error) {
        console.error("Could not load saved savings goals:", error);
        state.savingsGoals = [];
        showToast("Saved goals could not be read. You can create new goals.", "warning");
    }
}

function saveSavingsGoals() {
    if (state.backendConnected) return true;
    try {
        localStorage.setItem(getScopedStorageKey("spendflow_savings_goals"), JSON.stringify(state.savingsGoals));
        return true;
    } catch (error) {
        console.error("Could not save savings goals:", error);
        showToast("Could not save your goal in this browser. Check available storage.", "error");
        return false;
    }
}

function loadCategoryBudgets() {
    const storedBudgets = localStorage.getItem(getScopedStorageKey("spendflow_category_budgets"));
    if (!storedBudgets) return;

    try {
        const budgets = JSON.parse(storedBudgets);
        const validCategories = Object.keys(CATEGORY_META);
        if (!budgets || Array.isArray(budgets) || typeof budgets !== "object" ||
            Object.entries(budgets).some(([category, amount]) =>
                !validCategories.includes(category) || !Number.isFinite(Number(amount)) || Number(amount) <= 0
            )) {
            throw new Error("Saved category budgets have an invalid format.");
        }
        state.categoryBudgets = budgets;
    } catch (error) {
        console.error("Could not load saved category budgets:", error);
        state.categoryBudgets = {};
        showToast("Saved category limits could not be read. You can set them again.", "warning");
    }
}

function saveCategoryBudgets() {
    if (state.backendConnected) return true;
    try {
        localStorage.setItem(getScopedStorageKey("spendflow_category_budgets"), JSON.stringify(state.categoryBudgets));
        return true;
    } catch (error) {
        console.error("Could not save category budgets:", error);
        showToast("Could not save category limits in this browser. Check available storage.", "error");
        return false;
    }
}

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function loadLocalFinancialData() {
    loadSavingsGoals();
    loadCategoryBudgets();
    try {
        const shared = JSON.parse(localStorage.getItem(getScopedStorageKey("spendflow_shared_expenses")) || "[]");
        const notifications = JSON.parse(localStorage.getItem(getScopedStorageKey("spendflow_notifications")) || "[]");
        state.sharedExpenses = Array.isArray(shared) ? shared : [];
        state.notifications = Array.isArray(notifications) ? notifications : [];
    } catch (error) {
        console.error("Could not load local financial data:", error);
        state.sharedExpenses = [];
        state.notifications = [];
        showToast("Some saved local insights could not be loaded.", "warning");
    }
    renderNotifications();
}

function saveLocalCollection(key, items) {
    if (state.backendConnected) return;
    try {
        localStorage.setItem(getScopedStorageKey(key), JSON.stringify(items));
    } catch (error) {
        console.error(`Could not save ${key}:`, error);
        showToast("Could not save this update in browser storage.", "error");
    }
}

// ==========================================================================
// Event Listeners (Safe Null-Checked)
// ==========================================================================

function initEventListeners() {
    if (elements.calendarPreviousBtn) {
        elements.calendarPreviousBtn.addEventListener("click", () => changeCalendarMonth(-1));
    }
    if (elements.calendarNextBtn) {
        elements.calendarNextBtn.addEventListener("click", () => changeCalendarMonth(1));
    }
    if (elements.calendarTodayBtn) {
        elements.calendarTodayBtn.addEventListener("click", () => {
            const today = new Date();
            state.calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            state.selectedCalendarDate = getLocalDateKey(today);
            renderSpendingCalendar();
        });
    }
    if (elements.spendingCalendarGrid) {
        elements.spendingCalendarGrid.addEventListener("click", event => {
            const dayButton = event.target.closest("button[data-calendar-date]");
            if (!dayButton) return;
            state.selectedCalendarDate = dayButton.dataset.calendarDate;
            renderSpendingCalendar();
        });
    }

    if (elements.categoryBudgetForm) {
        elements.categoryBudgetForm.addEventListener("submit", handleSaveCategoryBudget);
    }
    if (elements.categoryBudgetsList) {
        elements.categoryBudgetsList.addEventListener("click", handleCategoryBudgetAction);
    }

    if (elements.savingsGoalForm) {
        elements.savingsGoalForm.addEventListener("submit", handleCreateSavingsGoal);
    }
    if (elements.savingsGoalsList) {
        elements.savingsGoalsList.addEventListener("click", handleSavingsGoalAction);
        elements.savingsGoalsList.addEventListener("keydown", handleSavingsGoalKeydown);
    }
    if (elements.notificationList) {
        elements.notificationList.addEventListener("click", handleNotificationAction);
    }
    if (elements.refreshNotificationsBtn) {
        elements.refreshNotificationsBtn.addEventListener("click", refreshNotifications);
    }
    if (elements.sharedSplitForm) {
        elements.sharedSplitForm.addEventListener("submit", handleCreateSharedSplit);
    }
    if (elements.sharedSplitsList) {
        elements.sharedSplitsList.addEventListener("click", handleSharedExpenseAction);
    }

    // Expense Form Submission
    if (elements.expenseForm) {
        elements.expenseForm.addEventListener("submit", handleAddExpense);
    }
    if (elements.cancelExpenseEditBtn) {
        elements.cancelExpenseEditBtn.addEventListener("click", cancelExpenseEdit);
    }
    if (elements.scanReceiptBtn && elements.receiptImageInput) {
        elements.scanReceiptBtn.addEventListener("click", () => {
            if (state.editingExpenseId !== null) {
                showReceiptScanStatus("Cancel editing before scanning a new receipt.");
                return;
            }
            elements.receiptImageInput.click();
        });
        elements.receiptImageInput.addEventListener("change", handleReceiptImageSelection);
    }
    const statementFileInput = document.getElementById("statement-file-input");
    const confirmStatementImportBtn = document.getElementById("confirm-statement-import-btn");
    const cancelStatementImportBtn = document.getElementById("cancel-statement-import-btn");
    if (statementFileInput) statementFileInput.addEventListener("change", handleStatementFileSelection);
    if (confirmStatementImportBtn) confirmStatementImportBtn.addEventListener("click", importStatementTransactions);
    if (cancelStatementImportBtn) cancelStatementImportBtn.addEventListener("click", clearStatementImportPreview);

    // Search & Filter
    if (elements.searchInput) {
        elements.searchInput.addEventListener("input", (e) => {
            state.searchQuery = e.target.value.trim().toLowerCase();
            if (elements.clearSearchBtn) {
                elements.clearSearchBtn.classList.toggle("hidden", state.searchQuery === "");
            }
            renderExpensesList();
        });
    }

    if (elements.clearSearchBtn) {
        elements.clearSearchBtn.addEventListener("click", () => {
            if (elements.searchInput) elements.searchInput.value = "";
            state.searchQuery = "";
            elements.clearSearchBtn.classList.add("hidden");
            renderExpensesList();
        });
    }

    if (elements.categoryFilter) {
        elements.categoryFilter.addEventListener("change", (e) => {
            state.categoryFilter = e.target.value;
            renderExpensesList();
        });
    }

    if (elements.sortSelect) {
        elements.sortSelect.addEventListener("change", (e) => {
            state.sortBy = e.target.value;
            renderExpensesList();
        });
    }

    // Budget Modals
    if (elements.openBudgetModalBtn) elements.openBudgetModalBtn.addEventListener("click", openBudgetModal);
    if (elements.quickEditBudgetBtn) elements.quickEditBudgetBtn.addEventListener("click", openBudgetModal);
    if (elements.closeBudgetModalBtn) elements.closeBudgetModalBtn.addEventListener("click", closeBudgetModal);
    if (elements.cancelBudgetModalBtn) elements.cancelBudgetModalBtn.addEventListener("click", closeBudgetModal);
    if (elements.budgetForm) elements.budgetForm.addEventListener("submit", handleSaveBudget);

    // Quick Budget Presets
    document.querySelectorAll(".preset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (!elements.budgetInput) return;
            const currentVal = parseFloat(elements.budgetInput.value) || state.budget;
            if (btn.dataset.add) {
                elements.budgetInput.value = currentVal + parseFloat(btn.dataset.add);
            } else if (btn.dataset.set) {
                elements.budgetInput.value = parseFloat(btn.dataset.set);
            }
        });
    });

    // Enable desktop notifications button
    if (elements.enableNotificationsBtn) {
        elements.enableNotificationsBtn.addEventListener("click", () => {
            playAlertChime(false); // Play continuous caution chime preview (3.5s)
            requestNotificationPermission();
        });
        updateNotificationButtonState();
    }

    // Click on alert icon to test or stop 3.5-second continuous alert sound
    const alertIconEl = document.getElementById("alert-icon");
    if (alertIconEl && !alertIconEl.dataset.bound) {
        alertIconEl.dataset.bound = "true";
        alertIconEl.style.cursor = "pointer";
        alertIconEl.title = "Click to play/stop continuous alert sound (3.5s)";
        alertIconEl.addEventListener("click", () => {
            if (activeAlertOsc) {
                stopCurrentAlertSound();
                showToast("Alert sound stopped", "info");
            } else {
                playAlertChime(true);
                showToast("Playing continuous alert alarm (~3.5 seconds) 🔔", "warning");
            }
        });
    }

    // Close budget alert banner and stop any active alarm
    if (elements.alertCloseBtn && elements.alertBanner) {
        elements.alertCloseBtn.addEventListener("click", () => {
            stopCurrentAlertSound();
            elements.alertBanner.classList.add("hidden");
        });
    }

    // Clear All Modal
    if (elements.clearAllBtn && elements.confirmModal) {
        elements.clearAllBtn.addEventListener("click", () => {
            elements.confirmModal.classList.remove("hidden");
        });
    }
    if (elements.cancelConfirmBtn && elements.confirmModal) {
        elements.cancelConfirmBtn.addEventListener("click", () => {
            elements.confirmModal.classList.add("hidden");
        });
    }
    if (elements.closeConfirmModalBtn && elements.confirmModal) {
        elements.closeConfirmModalBtn.addEventListener("click", () => {
            elements.confirmModal.classList.add("hidden");
        });
    }
    if (elements.confirmClearAllBtn) {
        elements.confirmClearAllBtn.addEventListener("click", handleClearAllExpenses);
    }

    // Currency Change
    if (elements.currencySelect) {
        elements.currencySelect.addEventListener("change", async e => {
            const previousCurrency = state.currency;
            state.currency = e.target.value;
            updateCurrencyDisplays();
            if (state.backendConnected && state.budget > 0) {
                try {
                    const response = await fetch("/api/budget", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount: state.budget, currency: state.currency })
                    });
                    if (!response.ok) throw new Error(`Saving the currency failed (${response.status}).`);
                } catch (error) {
                    console.error("Could not save account currency:", error);
                    state.currency = previousCurrency;
                    elements.currencySelect.value = previousCurrency;
                    updateCurrencyDisplays();
                    showToast("Could not save the currency to your account.", "error");
                    return;
                }
            } else {
                saveToLocalStorage();
            }
            renderAll();
            showToast(`Currency changed to ${state.currency}`, "info");
        });
    }

    // CSV Export
    if (elements.exportCsvBtn) {
        elements.exportCsvBtn.addEventListener("click", exportExpensesToCSV);
    }
}

async function handleReceiptImageSelection(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!supportedTypes.includes(file.type)) {
        showReceiptScanStatus("Choose a JPG, PNG, or WebP image to scan.");
        event.target.value = "";
        return;
    }

    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
        showReceiptScanStatus("This image is larger than 10 MB. Choose a smaller or compressed receipt image.");
        event.target.value = "";
        return;
    }

    if (!window.Tesseract || typeof window.Tesseract.recognize !== "function") {
        showReceiptScanStatus("Receipt scanning is unavailable. Check your internet connection and reload the page.");
        event.target.value = "";
        return;
    }

    if (elements.scanReceiptBtn) elements.scanReceiptBtn.disabled = true;
    showReceiptScanStatus("Preparing your receipt…");
    try {
        const result = await window.Tesseract.recognize(file, "eng", {
            logger: progress => {
                if (progress.status === "recognizing text") {
                    showReceiptScanStatus(`Reading receipt… ${Math.round((progress.progress || 0) * 100)}%`);
                } else if (progress.status) {
                    showReceiptScanStatus("Preparing receipt reader…");
                }
            }
        });
        const recognizedText = result && result.data && result.data.text;
        if (typeof recognizedText !== "string" || !recognizedText.trim()) {
            throw new Error("The OCR reader returned no receipt text.");
        }
        const parsed = parseReceiptText(recognizedText);

        if (parsed.title && elements.inputTitle) elements.inputTitle.value = parsed.title;
        if (parsed.amount !== null && elements.inputAmount) elements.inputAmount.value = parsed.amount;
        if (parsed.date && elements.inputDate) elements.inputDate.value = parsed.date;
        if (parsed.category && elements.inputCategory) elements.inputCategory.value = parsed.category;
        if (parsed.paymentMethod && elements.inputPayment) elements.inputPayment.value = parsed.paymentMethod;

        const missing = [];
        if (!parsed.title) missing.push("title");
        if (parsed.amount === null) missing.push("amount");
        if (!parsed.date) missing.push("date");
        if (!parsed.category) missing.push("category");
        const confidence = Number(result.data.confidence);
        const lowConfidence = Number.isFinite(confidence) && confidence < 45;
        showReceiptScanStatus(
            lowConfidence
                ? `The scan may be unclear (${Math.round(confidence)}% confidence). Check every suggested field before saving${missing.length ? ` and enter the ${missing.join(", ")}` : ""}.`
                : missing.length
                    ? `Receipt read. Please check the details and enter the ${missing.join(", ")} before saving.`
                    : "Receipt read. Please review the suggested details before saving."
        );
        if (elements.inputTitle) elements.inputTitle.focus();
    } catch (error) {
        console.error("Receipt scanning failed:", error);
        showReceiptScanStatus("We couldn't read this receipt. Try a clearer, well-lit photo or enter the details manually.");
    } finally {
        if (elements.scanReceiptBtn) elements.scanReceiptBtn.disabled = false;
        event.target.value = "";
    }
}

function showReceiptScanStatus(message) {
    if (!elements.receiptScanStatus) return;
    elements.receiptScanStatus.textContent = message;
    elements.receiptScanStatus.classList.remove("hidden");
}

function parseReceiptText(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const normalizedText = lines.join(" ");

    const totalLinePatterns = [
        /\b(grand\s*total|total\s*due|amount\s*due|amount\s*payable|net\s*payable|balance\s*due)\b/i,
        /\btotal\b/i
    ];
    let amount = null;
    for (const pattern of totalLinePatterns) {
        const matchingLines = lines.filter(line =>
            pattern.test(line) && !/\b(sub\s*total|tax|discount|change|cash\s*tendered)\b/i.test(line)
        );
        for (const line of matchingLines) {
            const withoutDates = line.replace(/\b(?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})\b/g, " ");
            const matches = [...withoutDates.matchAll(/(?:₹|Rs\.?|INR)?\s*((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?)/gi)];
            if (matches.length) {
                const candidate = Number(matches[matches.length - 1][1].replace(/,/g, ""));
                if (Number.isFinite(candidate) && candidate > 0) {
                    amount = candidate;
                    break;
                }
            }
        }
        if (amount !== null) break;
    }

    let date = null;
    const isoDate = normalizedText.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    const localDate = normalizedText.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
    if (isoDate || localDate) {
        const year = Number(isoDate ? isoDate[1] : localDate[3]);
        const month = Number(isoDate ? isoDate[2] : localDate[2]);
        const day = Number(isoDate ? isoDate[3] : localDate[1]);
        const candidateDate = new Date(Date.UTC(year, month - 1, day));
        if (candidateDate.getUTCFullYear() === year && candidateDate.getUTCMonth() === month - 1 && candidateDate.getUTCDate() === day) {
            date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
    }

    const ignoredMerchantLine = /\b(receipt|tax\s*invoice|invoice|bill|gst|vat|phone|tel|date|time|cashier|subtotal|total|amount|qty|quantity|price|item|thank\s*you)\b/i;
    const merchantLine = lines.find(line => {
        const candidate = line.replace(/[^a-zA-Z&'. -]/g, "").trim();
        return candidate.length >= 2 && candidate.length <= 60 && /[a-zA-Z]{2}/.test(candidate) && !ignoredMerchantLine.test(candidate);
    });
    const title = merchantLine ? `Receipt: ${merchantLine}`.slice(0, 100) : "";

    const categoryRules = [
        ["Shopping & Groceries", /\b(grocery|groceries|supermarket|market|mart)\b/i],
        ["Food & Dining", /\b(restaurant|cafe|coffee|bakery|food|dining|pizza|burger)\b/i],
        ["Transportation", /\b(fuel|petrol|diesel|gas station|taxi|uber|ola|metro|parking)\b/i],
        ["Bills & Utilities", /\b(electricity|utility|water bill|internet|broadband|mobile recharge)\b/i],
        ["Entertainment", /\b(cinema|movie|theatre|streaming|concert)\b/i],
        ["Health & Medical", /\b(pharmacy|medical|hospital|clinic|doctor)\b/i],
        ["Education", /\b(bookstore|school|college|tuition|education)\b/i],
        ["Travel & Leisure", /\b(hotel|flight|airline|travel|resort)\b/i]
    ];
    const categoryMatch = categoryRules.find(([, pattern]) => pattern.test(normalizedText));
    const paymentMethod = /\b(upi|gpay|google\s*pay|phonepe|paytm)\b/i.test(normalizedText)
        ? "UPI"
        : /\b(credit\s*card|visa|mastercard)\b/i.test(normalizedText)
            ? "Credit Card"
            : /\b(debit\s*card)\b/i.test(normalizedText)
                ? "Debit Card"
                : /\bcash\b/i.test(normalizedText)
                    ? "Cash"
                    : "";

    return {
        title,
        amount,
        date,
        category: categoryMatch ? categoryMatch[0] : "",
        paymentMethod
    };
}

async function handleCreateSavingsGoal(event) {
    event.preventDefault();
    const name = elements.goalNameInput.value.trim();
    const target = Number(elements.goalTargetInput.value);
    const saved = elements.goalSavedInput.value === "" ? 0 : Number(elements.goalSavedInput.value);
    const deadline = elements.goalDeadlineInput.value;

    if (!name || !Number.isFinite(target) || target <= 0 || !Number.isFinite(saved) || saved < 0) {
        showToast("Enter a goal name, a positive target, and a valid saved amount.", "error");
        return;
    }

    const goal = {
        name,
        target,
        saved,
        deadline
    };
    if (state.backendConnected) {
        try {
            const response = await fetch("/api/savings-goals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    targetAmount: target,
                    currentAmount: saved,
                    deadline: deadline || null
                })
            });
            if (!response.ok) throw new Error(`Saving the goal failed (${response.status}).`);
            const savedGoal = await response.json();
            goal.id = String(savedGoal.id);
        } catch (error) {
            console.error("Could not save savings goal:", error);
            showToast("Could not save this goal to your account. Please try again.", "error");
            return;
        }
    } else {
        goal.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    state.savingsGoals.unshift(goal);
    if (!saveSavingsGoals()) {
        state.savingsGoals.shift();
        return;
    }

    elements.savingsGoalForm.reset();
    elements.goalSavedInput.value = "0";
    renderSavingsGoals();
    showToast(`Savings goal “${name}” created.`, "success");
}

async function handleSavingsGoalAction(event) {
    const button = event.target.closest("button[data-goal-action]");
    if (!button) return;

    const goal = state.savingsGoals.find(item => item.id === button.dataset.goalId);
    if (!goal) return;

    if (button.dataset.goalAction === "delete") {
        if (!window.confirm(`Delete the savings goal “${goal.name}”?`)) return;
        if (state.backendConnected) {
            try {
                const response = await fetch(`/api/savings-goals/${encodeURIComponent(goal.id)}`, { method: "DELETE" });
                if (!response.ok) throw new Error(`Deleting the goal failed (${response.status}).`);
            } catch (error) {
                console.error("Could not delete savings goal:", error);
                showToast("Could not delete this goal from your account.", "error");
                return;
            }
        }
        const previousGoals = state.savingsGoals;
        state.savingsGoals = state.savingsGoals.filter(item => item.id !== goal.id);
        if (!saveSavingsGoals()) state.savingsGoals = previousGoals;
        renderSavingsGoals();
        return;
    }

    if (button.dataset.goalAction === "contribute") {
        const input = Array.from(elements.savingsGoalsList.querySelectorAll("[data-contribution-for]"))
            .find(item => item.dataset.contributionFor === goal.id);
        const amount = input ? Number(input.value) : NaN;
        if (!Number.isFinite(amount) || amount <= 0) {
            showToast("Enter a contribution greater than zero.", "error");
            if (input) input.focus();
            return;
        }
        const previousSaved = goal.saved;
        const updatedSaved = previousSaved + amount;
        if (state.backendConnected) {
            try {
                const response = await fetch(`/api/savings-goals/${encodeURIComponent(goal.id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: goal.name,
                        targetAmount: goal.target,
                        currentAmount: updatedSaved,
                        deadline: goal.deadline || null
                    })
                });
                if (!response.ok) throw new Error(`Updating the goal failed (${response.status}).`);
            } catch (error) {
                console.error("Could not update savings contribution:", error);
                showToast("Could not save this contribution to your account.", "error");
                return;
            }
        }
        goal.saved = updatedSaved;
        if (!saveSavingsGoals()) {
            goal.saved = previousSaved;
            return;
        }
        renderSavingsGoals();
        if (previousSaved < goal.target && goal.saved >= goal.target) {
            showToast(`🎉 Goal reached: ${goal.name}!`, "success");
        } else {
            showToast(`${formatCurrency(amount)} added to “${goal.name}”.`, "success");
        }
    }
}

function handleSavingsGoalKeydown(event) {
    if (event.key !== "Enter" || !event.target.matches("[data-contribution-for]")) return;
    event.preventDefault();
    const goalId = event.target.dataset.contributionFor;
    const button = Array.from(elements.savingsGoalsList.querySelectorAll('[data-goal-action="contribute"]'))
        .find(item => item.dataset.goalId === goalId);
    if (button) button.click();
}

async function handleSaveCategoryBudget(event) {
    event.preventDefault();
    const category = elements.categoryBudgetCategory.value;
    const amount = Number(elements.categoryBudgetAmount.value);
    if (!Object.prototype.hasOwnProperty.call(CATEGORY_META, category) || !Number.isFinite(amount) || amount <= 0) {
        showToast("Choose a category and enter a monthly limit greater than zero.", "error");
        return;
    }

    const previousCategory = state.editingCategoryBudgetCategory;
    const id = state.editingCategoryBudgetId;
    if (state.backendConnected) {
        try {
            const response = await fetch(id
                ? `/api/category-budgets/${encodeURIComponent(id)}`
                : "/api/category-budgets", {
                method: id ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category,
                    amount,
                    currency: state.currency,
                    monthYear: getCurrentMonthKey()
                })
            });
            if (!response.ok) {
                const message = response.status === 409
                    ? "A limit already exists for this category this month."
                    : `Saving the category limit failed (${response.status}).`;
                throw new Error(message);
            }
            const savedBudget = await response.json();
            if (previousCategory && previousCategory !== category) {
                delete state.categoryBudgets[previousCategory];
                delete state.categoryBudgetIds[previousCategory];
            }
            state.categoryBudgets[category] = Number(savedBudget.amount);
            state.categoryBudgetIds[category] = String(savedBudget.id);
        } catch (error) {
            console.error("Could not save category budget:", error);
            showToast(error.message || "Could not save this category limit.", "error");
            return;
        }
    } else {
        const previousBudgets = { ...state.categoryBudgets };
        const previousIds = { ...state.categoryBudgetIds };
        if (previousCategory && previousCategory !== category) {
            delete state.categoryBudgets[previousCategory];
            delete state.categoryBudgetIds[previousCategory];
        }
        state.categoryBudgets[category] = amount;
        if (!saveCategoryBudgets()) {
            state.categoryBudgets = previousBudgets;
            state.categoryBudgetIds = previousIds;
            return;
        }
    }
    state.editingCategoryBudgetId = null;
    state.editingCategoryBudgetCategory = null;
    elements.categoryBudgetForm.reset();
    renderCategoryBudgets();
    showToast(`Monthly limit set for ${category}.`, "success");
}

async function handleCategoryBudgetAction(event) {
    const button = event.target.closest("button[data-category-budget-action]");
    if (!button) return;

    const category = button.dataset.category;
    if (!Object.prototype.hasOwnProperty.call(state.categoryBudgets, category)) return;

    if (button.dataset.categoryBudgetAction === "edit") {
        state.editingCategoryBudgetId = state.categoryBudgetIds[category] || null;
        state.editingCategoryBudgetCategory = category;
        elements.categoryBudgetCategory.value = category;
        elements.categoryBudgetAmount.value = state.categoryBudgets[category];
        elements.categoryBudgetForm.scrollIntoView({ behavior: "smooth", block: "center" });
        elements.categoryBudgetAmount.focus({ preventScroll: true });
        return;
    }

    if (button.dataset.categoryBudgetAction !== "remove") return;

    if (state.backendConnected && state.categoryBudgetIds[category]) {
        try {
            const response = await fetch(`/api/category-budgets/${encodeURIComponent(state.categoryBudgetIds[category])}`, {
                method: "DELETE"
            });
            if (!response.ok) throw new Error(`Removing the category limit failed (${response.status}).`);
        } catch (error) {
            console.error("Could not remove category budget:", error);
            showToast("Could not remove this category limit from your account.", "error");
            return;
        }
    }
    const previousBudgets = { ...state.categoryBudgets };
    delete state.categoryBudgets[category];
    delete state.categoryBudgetIds[category];
    if (!saveCategoryBudgets()) {
        state.categoryBudgets = previousBudgets;
        return;
    }
    renderCategoryBudgets();
    showToast(`Monthly limit removed for ${category}.`, "info");
}

// ==========================================================================
// Handlers: Add, Delete, Clear, Edit Budget
// ==========================================================================

async function handleStatementFileSelection(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showToast("Statement files must be smaller than 5 MB.", "error");
        event.target.value = "";
        return;
    }

    try {
        const text = (await file.text()).replace(/^\uFEFF/, "");
        const rows = parseStatementCsv(text);
        if (!rows.length) throw new Error("No outgoing transactions with valid dates, descriptions, and amounts were found.");
        state.statementImportRows = rows;
        const preview = document.getElementById("statement-import-preview");
        const review = document.getElementById("statement-import-review");
        const summary = document.getElementById("statement-import-summary");
        const uniqueRows = getUniqueStatementRows(rows);
        const duplicates = rows.length - uniqueRows.length;
        summary.textContent = `${rows.length} outgoing transaction${rows.length === 1 ? "" : "s"} detected${duplicates ? `; ${duplicates} duplicate entr${duplicates === 1 ? "y" : "ies"} will be skipped` : ""}. Review the sample below. Category suggestions are based on the description.`;
        preview.innerHTML = rows.slice(0, 8).map(row => `
            <tr>
                <td>${escapeHtml(row.date)}</td>
                <td>${escapeHtml(row.title)}</td>
                <td>${escapeHtml(formatCurrency(row.amount))}</td>
                <td>${escapeHtml(row.category)}</td>
            </tr>
        `).join("");
        if (rows.length > 8) summary.textContent += ` Showing 8 of ${rows.length}.`;
        review.classList.remove("hidden");
        document.getElementById("confirm-statement-import-btn").disabled = uniqueRows.length === 0;
    } catch (error) {
        console.error("Could not read payment statement:", error);
        showToast(error.message || "Could not read this statement. Use a CSV or TSV file with transaction date, description, and amount columns.", "error");
        clearStatementImportPreview();
    }
}

function parseStatementCsv(text) {
    const firstLine = text.split(/\r?\n/, 1)[0] || "";
    const delimiter = detectCsvDelimiter(firstLine);
    const records = parseDelimitedText(text, delimiter);
    const normalizeHeader = value => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const findColumn = (headers, aliases) => headers.findIndex(header => aliases.includes(normalizeHeader(header)));
    let headerRowIndex = -1;
    let columns;

    for (let index = 0; index < Math.min(records.length, 10); index++) {
        const headers = records[index];
        const dateIndex = findColumn(headers, ["date", "transactiondate", "txndate", "valuedate", "transactiondatetime"]);
        const descriptionIndex = findColumn(headers, ["description", "details", "narration", "merchant", "transactiondetails", "remarks", "payee", "particulars", "name"]);
        const debitIndex = findColumn(headers, ["debit", "withdrawal", "withdrawals", "paid", "debitamount", "withdrawalamount", "moneyout", "paidamount"]);
        const amountIndex = findColumn(headers, ["amount", "transactionamount", "txnamount", "amountinr", "amountrs"]);
        if (dateIndex >= 0 && descriptionIndex >= 0 && (debitIndex >= 0 || amountIndex >= 0)) {
            headerRowIndex = index;
            columns = {
                dateIndex,
                descriptionIndex,
                debitIndex,
                amountIndex,
                typeIndex: findColumn(headers, ["type", "transactiontype", "txntype", "direction", "drcr"])
            };
            break;
        }
    }
    if (headerRowIndex < 0) {
        throw new Error("Could not identify date, description, and amount columns. Download the statement as CSV and check its column headings.");
    }

    const transactions = [];
    for (const record of records.slice(headerRowIndex + 1)) {
        const description = String(record[columns.descriptionIndex] || "").trim();
        const date = parseStatementDate(record[columns.dateIndex]);
        const type = columns.typeIndex >= 0 ? String(record[columns.typeIndex] || "").toLowerCase() : "";
        const isCredit = /^(cr|credit|credited|received|refund|refunded|cashback|deposit|inward|reversal)\b/.test(type.trim()) &&
            !/^credit card\b/.test(type.trim());
        const amountText = record[columns.debitIndex >= 0 ? columns.debitIndex : columns.amountIndex];
        const amount = parseStatementAmount(amountText);
        if (!description || !date || amount === null || amount <= 0 || isCredit) continue;
        transactions.push({
            title: description.slice(0, 100),
            amount,
            category: guessExpenseCategory(description),
            date,
            paymentMethod: "Online payment (statement import)"
        });
    }
    return transactions;
}

function detectCsvDelimiter(line) {
    let delimiter = ",";
    let maximumCount = -1;
    for (const candidate of [",", ";", "\t"]) {
        let count = 0;
        let quoted = false;
        for (let index = 0; index < line.length; index++) {
            if (line[index] === '"') {
                if (quoted && line[index + 1] === '"') index++;
                else quoted = !quoted;
            } else if (line[index] === candidate && !quoted) {
                count++;
            }
        }
        if (count > maximumCount) {
            maximumCount = count;
            delimiter = candidate;
        }
    }
    return delimiter;
}

function parseDelimitedText(text, delimiter) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < text.length; index++) {
        const character = text[index];
        if (character === '"') {
            if (quoted && text[index + 1] === '"') {
                cell += '"';
                index++;
            } else {
                quoted = !quoted;
            }
        } else if (character === delimiter && !quoted) {
            row.push(cell.trim());
            cell = "";
        } else if ((character === "\n" || character === "\r") && !quoted) {
            if (character === "\r" && text[index + 1] === "\n") index++;
            row.push(cell.trim());
            if (row.some(value => value !== "")) rows.push(row);
            row = [];
            cell = "";
        } else {
            cell += character;
        }
    }
    if (quoted) throw new Error("This statement contains an unclosed quoted field.");
    row.push(cell.trim());
    if (row.some(value => value !== "")) rows.push(row);
    return rows;
}

function parseStatementDate(value) {
    const text = String(value || "").trim();
    let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) return createDateKey(Number(match[1]), Number(match[2]), Number(match[3]));
    match = text.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
    if (match) return createDateKey(Number(match[3]), Number(match[2]), Number(match[1]));
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return "";
    return getLocalDateKey(parsed);
}

function createDateKey(year, month, day) {
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseStatementAmount(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    let normalized = text.replace(/[^\d.,]/g, "");
    const lastComma = normalized.lastIndexOf(",");
    const lastPeriod = normalized.lastIndexOf(".");
    if (lastComma >= 0 && lastPeriod >= 0) {
        const decimalSeparator = lastComma > lastPeriod ? "," : ".";
        const groupingSeparator = decimalSeparator === "," ? "." : ",";
        normalized = normalized.split(groupingSeparator).join("");
        if (decimalSeparator === ",") normalized = normalized.replace(",", ".");
    } else if (lastComma >= 0) {
        const decimalComma = normalized.length - lastComma - 1 === 2;
        normalized = decimalComma
            ? normalized.slice(0, lastComma).replace(/,/g, "") + "." + normalized.slice(lastComma + 1)
            : normalized.replace(/,/g, "");
    }
    const number = Number(normalized);
    if (!Number.isFinite(number) || number <= 0) return null;
    return number;
}

function guessExpenseCategory(description) {
    const text = description.toLowerCase();
    if (/restaurant|food|cafe|coffee|swiggy|zomato|dining|grocery|grocer|supermarket/.test(text)) return "Food & Dining";
    if (/uber|ola|rapido|taxi|metro|bus|train|fuel|petrol|parking|transport/.test(text)) return "Transportation";
    if (/electric|electricity|water bill|internet|broadband|mobile recharge|utility|gas bill/.test(text)) return "Bills & Utilities";
    if (/amazon|flipkart|shopping|store|mart|retail|myntra/.test(text)) return "Shopping & Groceries";
    if (/movie|cinema|netflix|spotify|entertainment|concert/.test(text)) return "Entertainment";
    if (/hospital|pharmacy|medical|clinic|health/.test(text)) return "Health & Medical";
    if (/school|college|course|education|tuition/.test(text)) return "Education";
    if (/hotel|flight|airline|travel|booking/.test(text)) return "Travel & Leisure";
    return "Other";
}

function getStatementFingerprint(expense) {
    return `${expense.date}|${Number(expense.amount).toFixed(2)}|${String(expense.title || "").trim().toLowerCase()}`;
}

function getUniqueStatementRows(rows) {
    const existing = new Set(state.expenses.map(getStatementFingerprint));
    return rows.filter(row => !existing.has(getStatementFingerprint(row)));
}

function clearStatementImportPreview() {
    state.statementImportRows = [];
    const review = document.getElementById("statement-import-review");
    const fileInput = document.getElementById("statement-file-input");
    const confirmButton = document.getElementById("confirm-statement-import-btn");
    if (review) review.classList.add("hidden");
    if (fileInput) fileInput.value = "";
    if (confirmButton) confirmButton.disabled = false;
}

async function importStatementTransactions(event) {
    const button = event.currentTarget;
    const parsedRowCount = state.statementImportRows.length;
    const rows = getUniqueStatementRows(state.statementImportRows);
    if (!rows.length) {
        showToast("There are no new transactions to import.", "info");
        clearStatementImportPreview();
        return;
    }

    button.disabled = true;
    let imported = 0;
    let importError = null;
    for (const row of rows) {
        try {
            if (state.backendConnected) {
                const response = await fetch("/api/expenses", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(row)
                });
                if (!response.ok) throw new Error(`Saving a transaction failed (${response.status}).`);
                state.expenses.unshift(await response.json());
            } else {
                state.expenses.unshift({ ...row, id: Date.now() + imported });
            }
            imported++;
        } catch (error) {
            importError = error;
            console.error("Could not import a payment statement transaction:", error);
            break;
        }
    }

    let storageError = null;
    try {
        saveToLocalStorage();
    } catch (error) {
        console.error("Could not save imported transactions to browser storage:", error);
        storageError = error;
    }
    clearStatementImportPreview();
    renderAll();
    if (imported > 0) {
        await ensureUnusualSpendingNotifications();
        if (state.backendConnected) await refreshNotifications();
    }
    if (storageError) {
        showToast(`Imported ${imported} transactions in this session, but browser storage failed. Check available storage before leaving this page.`, "error");
    } else if (importError) {
        showToast(`Imported ${imported} of ${rows.length} transactions. Some could not be saved; check the console and retry only the remaining rows.`, "error");
    } else {
        const duplicateCount = parsedRowCount - rows.length;
        showToast(`Imported ${imported} online payment${imported === 1 ? "" : "s"}${duplicateCount ? `; skipped ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"}` : ""}.`, "success");
    }
}

async function handleAddExpense(e) {
    e.preventDefault();

    if (!elements.inputTitle || !elements.inputAmount || !elements.inputCategory || !elements.inputDate) {
        return;
    }

    const title = elements.inputTitle.value.trim();
    const amount = parseFloat(elements.inputAmount.value);
    const category = elements.inputCategory.value;
    const date = elements.inputDate.value;
    const paymentMethod = elements.inputPayment ? elements.inputPayment.value : "UPI";

    if (!title || isNaN(amount) || amount <= 0 || !category || !date) {
        showToast("Please fill in all required fields properly", "error");
        return;
    }

    const expenseData = {
        title,
        amount,
        category,
        date,
        paymentMethod
    };

    if (state.editingExpenseId !== null) {
        const expenseId = state.editingExpenseId;
        try {
            let updatedExpense = { ...expenseData, id: expenseId };
            if (state.backendConnected) {
                const res = await fetch(`/api/expenses/${encodeURIComponent(expenseId)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(expenseData)
                });
                if (!res.ok) throw new Error(`Backend update failed (${res.status})`);
                updatedExpense = await res.json();
            }

            state.expenses = state.expenses.map(expense =>
                String(expense.id) === String(expenseId) ? { ...expense, ...updatedExpense, id: expense.id } : expense
            );
            saveToLocalStorage();
            resetExpenseForm();
            showToast("Expense updated successfully.", "success");
        } catch (err) {
            console.error("Failed to update expense:", err);
            showToast("Could not update the expense. Please try again.", "error");
            return;
        }
    } else if (state.backendConnected) {
        try {
            const res = await fetch("/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(expenseData)
            });
            if (res.ok) {
                const savedExpense = await res.json();
                state.expenses.unshift(savedExpense);
                showToast("Expense recorded to database successfully!", "success");
            } else {
                throw new Error(`Backend error (${res.status})`);
            }
        } catch (err) {
            console.error("Could not save expense to the account:", err);
            showToast("Could not save this expense to your account. Please try again.", "error");
            return;
        }
    } else {
        expenseData.id = Date.now();
        state.expenses.unshift(expenseData);
        saveToLocalStorage();
        showToast("Expense recorded successfully!", "success");
    }

    resetExpenseForm();
    await ensureUnusualSpendingNotifications();
    if (state.backendConnected) await refreshNotifications();

    // Re-render
    renderAll();
}

function startExpenseEdit(expenseId) {
    const expense = state.expenses.find(item => String(item.id) === String(expenseId));
    if (!expense || !elements.expenseForm) return;

    state.editingExpenseId = expense.id;
    elements.inputTitle.value = expense.title || "";
    elements.inputAmount.value = expense.amount;
    elements.inputCategory.value = expense.category || "";
    elements.inputDate.value = expense.date || "";
    if (elements.inputPayment) elements.inputPayment.value = expense.paymentMethod || "UPI";

    if (elements.submitExpenseBtn) {
        elements.submitExpenseBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i><span>Save Changes</span>';
    }
    if (elements.cancelExpenseEditBtn) elements.cancelExpenseEditBtn.classList.remove("hidden");
    if (elements.expenseFormTitle) elements.expenseFormTitle.textContent = "Edit Expense";

    elements.expenseForm.scrollIntoView({ behavior: "smooth", block: "center" });
    elements.inputTitle.focus({ preventScroll: true });
}

function cancelExpenseEdit() {
    resetExpenseForm();
}

function resetExpenseForm() {
    if (!elements.expenseForm) return;
    state.editingExpenseId = null;
    elements.expenseForm.reset();
    if (elements.inputDate) elements.inputDate.value = new Date().toISOString().split("T")[0];
    if (elements.inputPayment) elements.inputPayment.value = "UPI";
    if (elements.submitExpenseBtn) {
        elements.submitExpenseBtn.innerHTML = '<i class="fa-solid fa-plus-circle"></i><span>Record Expense</span>';
    }
    if (elements.cancelExpenseEditBtn) elements.cancelExpenseEditBtn.classList.add("hidden");
    if (elements.expenseFormTitle) elements.expenseFormTitle.textContent = "Add New Expense";
}

async function handleDeleteExpense(id) {
    const expenseToDelete = state.expenses.find(item => item.id == id);
    if (!expenseToDelete) return;

    if (state.backendConnected) {
        try {
            const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Backend delete failed");
        } catch (err) {
            console.error("Failed to delete on server:", err);
            showToast("Could not delete the expense from your account.", "error");
            return;
        }
    }

    state.expenses = state.expenses.filter(item => item.id != id);
    saveToLocalStorage();
    renderAll();
    showToast(`Deleted "${expenseToDelete.title}"`, "info");
}

async function handleClearAllExpenses() {
    if (state.backendConnected) {
        try {
            const response = await fetch("/api/expenses/clear-all", { method: "DELETE" });
            if (!response.ok) throw new Error(`Clearing expenses failed (${response.status}).`);
        } catch (err) {
            console.error("Could not clear expenses on the backend:", err);
            showToast("Could not clear expenses from your account.", "error");
            return;
        }
    }

    state.expenses = [];
    saveToLocalStorage();
    if (elements.confirmModal) elements.confirmModal.classList.add("hidden");
    renderAll();
    showToast("All expense records cleared", "info");
}

function openBudgetModal() {
    if (!elements.budgetModal) return;
    if (elements.budgetInput) {
        elements.budgetInput.value = state.budget > 0 ? state.budget : "";
        elements.budgetModal.classList.remove("hidden");
        elements.budgetInput.focus();
    }
}

function closeBudgetModal() {
    if (!elements.budgetModal) return;
    elements.budgetModal.classList.add("hidden");
}

async function handleSaveBudget(e) {
    e.preventDefault();
    if (!elements.budgetInput) return;

    const newBudget = parseFloat(elements.budgetInput.value);

    if (isNaN(newBudget) || newBudget <= 0) {
        showToast("Please enter a valid positive budget amount", "error");
        return;
    }

    const previousBudget = state.budget;
    state.budget = newBudget;

    if (state.backendConnected) {
        try {
            const response = await fetch("/api/budget", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: newBudget,
                    currency: state.currency
                })
            });
            if (!response.ok) throw new Error(`Saving the monthly budget failed (${response.status}).`);
        } catch (error) {
            console.error("Could not save budget to server:", error);
            state.budget = previousBudget;
            showToast("Could not save your monthly budget to your account.", "error");
            return;
        }
    }

    localStorage.setItem(getScopedStorageKey("spendflow_budget_configured"), "true");
    saveToLocalStorage();
    closeBudgetModal();
    renderAll();
    showToast(`Monthly budget set to ${formatCurrency(state.budget)}`, "success");
}

// ==========================================================================
// Rendering: Overview, Alerts, List, Charts, Dashboard Previews
// ==========================================================================

function renderAll() {
    renderOverview();
    renderExpensesList();
    renderCategoryBreakdown();
    renderMonthlyTrends();
    renderCategoryBudgets();
    renderSpendingCalendar();
    renderDashboardPreviews();
    renderSavingsGoals();
    renderFinancialInsights();
    renderSharedExpenseOptions();
    renderSharedExpenses();
    renderNotifications();
}

function renderOverview() {
    const totalSpent = state.expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const remaining = state.budget - totalSpent;
    const spentPercent = state.budget > 0 ? (totalSpent / state.budget) * 100 : 0;

    // Stat values
    if (elements.statBudget) elements.statBudget.textContent = state.budget > 0 ? formatCurrency(state.budget) : "Not set";
    if (elements.statSpent) elements.statSpent.textContent = formatCurrency(totalSpent);
    if (elements.statRemaining) elements.statRemaining.textContent = state.budget > 0 ? formatCurrency(Math.abs(remaining)) : "Set a budget";
    if (elements.statSpentPct) elements.statSpentPct.textContent = state.budget > 0
        ? `${spentPercent.toFixed(1)}% of budget used`
        : "Set a budget to track usage";

    // Remaining Balance Card Status Tag & Colors
    const balanceWrapper = document.getElementById("balance-icon-wrapper");
    if (elements.balanceCard) elements.balanceCard.classList.remove("border-danger", "border-warning");

    if (elements.balanceStatusTag && elements.statRemaining) {
        if (state.budget <= 0) {
            elements.balanceStatusTag.textContent = "Budget not set";
            elements.balanceStatusTag.className = "stat-status-tag";
            elements.statRemaining.style.color = "var(--gray-500)";
            if (balanceWrapper) balanceWrapper.className = "stat-icon-wrapper bg-purple-soft";
        } else if (remaining < 0) {
            elements.balanceStatusTag.textContent = "Deficit (Over Budget)";
            elements.balanceStatusTag.className = "stat-status-tag danger";
            elements.statRemaining.textContent = `-${formatCurrency(Math.abs(remaining))}`;
            elements.statRemaining.style.color = "var(--danger)";
            if (balanceWrapper) balanceWrapper.className = "stat-icon-wrapper bg-rose";
        } else if (spentPercent >= 80) {
            elements.balanceStatusTag.textContent = "Close to Limit";
            elements.balanceStatusTag.className = "stat-status-tag warning";
            elements.statRemaining.style.color = "var(--warning)";
            if (balanceWrapper) balanceWrapper.className = "stat-icon-wrapper bg-rose";
        } else {
            elements.balanceStatusTag.textContent = "Healthy & On Track";
            elements.balanceStatusTag.className = "stat-status-tag safe";
            elements.statRemaining.style.color = "var(--primary-900)";
            if (balanceWrapper) balanceWrapper.className = "stat-icon-wrapper bg-emerald";
        }
    }

    // Risk Level & Progress Bar Updates
    const boundedPct = Math.min(spentPercent, 100);
    if (elements.progressBarFill) {
        elements.progressBarFill.style.width = `${boundedPct}%`;
        elements.progressBarFill.classList.remove("fill-warning", "fill-danger");
    }
    if (elements.progressPercent) elements.progressPercent.textContent = `${spentPercent.toFixed(0)}%`;

    let currentRiskLevel = "safe";

    if (state.budget <= 0) {
        if (elements.progressCaption) {
            elements.progressCaption.textContent = "Set a monthly budget to enable risk alerts.";
            elements.progressCaption.style.color = "var(--gray-500)";
        }
        if (elements.riskLevelPill) {
            elements.riskLevelPill.textContent = "Budget not set";
            elements.riskLevelPill.className = "risk-level-pill risk-pill-safe";
        }
    } else if (spentPercent >= 100) {
        currentRiskLevel = "critical";
        if (elements.progressBarFill) elements.progressBarFill.classList.add("fill-danger");
        if (elements.progressCaption) {
            elements.progressCaption.textContent = "Budget exceeded! Immediate action required.";
            elements.progressCaption.style.color = "var(--danger)";
        }
        if (elements.riskLevelPill) {
            elements.riskLevelPill.textContent = "Critical Overdraft";
            elements.riskLevelPill.className = "risk-level-pill risk-pill-critical";
        }
    } else if (spentPercent >= 85) {
        currentRiskLevel = "high";
        if (elements.progressBarFill) elements.progressBarFill.classList.add("fill-warning");
        if (elements.progressCaption) {
            elements.progressCaption.textContent = "High Risk: Approaching limit (85%+)";
            elements.progressCaption.style.color = "var(--warning)";
        }
        if (elements.riskLevelPill) {
            elements.riskLevelPill.textContent = "High Risk";
            elements.riskLevelPill.className = "risk-level-pill risk-pill-high";
        }
    } else if (spentPercent >= 70) {
        currentRiskLevel = "moderate";
        if (elements.progressCaption) {
            elements.progressCaption.textContent = "Moderate: 70%+ of budget consumed";
            elements.progressCaption.style.color = "var(--warning)";
        }
        if (elements.riskLevelPill) {
            elements.riskLevelPill.textContent = "Moderate Risk";
            elements.riskLevelPill.className = "risk-level-pill risk-pill-moderate";
        }
    } else {
        currentRiskLevel = "safe";
        if (elements.progressCaption) {
            elements.progressCaption.textContent = "Safe: Well within budget";
            elements.progressCaption.style.color = "var(--gray-500)";
        }
        if (elements.riskLevelPill) {
            elements.riskLevelPill.textContent = "Low Risk";
            elements.riskLevelPill.className = "risk-level-pill risk-pill-safe";
        }
    }

    // Budget Alert Banner & Trigger Notification if changed
    renderBudgetAlert(totalSpent, state.budget, spentPercent, remaining, currentRiskLevel);
}

function renderBudgetAlert(spent, budget, percent, remaining, riskLevel) {
    if (!elements.alertBanner) return;
    if (budget <= 0) {
        elements.alertBanner.classList.add("hidden");
        state.lastAlertLevel = null;
        return;
    }
    elements.alertBanner.classList.remove("hidden");

    if (elements.riskScore) {
        elements.riskScore.textContent = `${percent.toFixed(1)}% Consumed`;
    }

    const alertIconEl = document.getElementById("alert-icon");

    if (riskLevel === "critical") {
        const overspent = Math.abs(remaining);
        elements.alertBanner.className = "budget-alert-banner alert-danger";
        if (elements.alertTitle) elements.alertTitle.textContent = "🚨 Risk Alert: Budget Limit Exceeded!";
        if (elements.alertMessage) elements.alertMessage.textContent = `You have spent ${formatCurrency(spent)}, exceeding your monthly budget of ${formatCurrency(budget)} by ${formatCurrency(overspent)}. Non-essential spending should be paused immediately.`;
        if (alertIconEl) alertIconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        if (elements.riskBadge) {
            elements.riskBadge.textContent = "CRITICAL OVERDRAFT";
            elements.riskBadge.className = "risk-badge badge-critical-risk";
        }

        // Trigger Audio Chime & Desktop Push Notification if transitioned to critical
        if (state.lastAlertLevel !== "critical") {
            playAlertChime(true);
            sendDesktopAlert(
                "🚨 Budget Limit Exceeded! - SpendFlow",
                `Warning: You have spent ${formatCurrency(spent)}, exceeding your monthly budget by ${formatCurrency(overspent)}!`
            );
            showToast(`Budget Exceeded by ${formatCurrency(overspent)}!`, "error");
            state.lastAlertLevel = "critical";
        }

    } else if (riskLevel === "high") {
        elements.alertBanner.className = "budget-alert-banner alert-high";
        if (elements.alertTitle) elements.alertTitle.textContent = "⚠️ High Risk Alert: 85%+ Budget Reached!";
        if (elements.alertMessage) elements.alertMessage.textContent = `You have used ${percent.toFixed(1)}% of your monthly budget. Only ${formatCurrency(remaining)} remaining before you reach your spending limit.`;
        if (alertIconEl) alertIconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        if (elements.riskBadge) {
            elements.riskBadge.textContent = "HIGH RISK";
            elements.riskBadge.className = "risk-badge badge-high-risk";
        }

        if (state.lastAlertLevel !== "high" && state.lastAlertLevel !== "critical") {
            playAlertChime(false, false, true);
            sendDesktopAlert(
                "⚠️ High Budget Risk Alert - SpendFlow",
                `Caution: You have consumed ${percent.toFixed(1)}% of your budget. Only ${formatCurrency(remaining)} remaining!`
            );
            showToast(`High spending risk: ${percent.toFixed(0)}% consumed`, "warning");
            state.lastAlertLevel = "high";
        }

    } else if (riskLevel === "moderate") {
        elements.alertBanner.className = "budget-alert-banner alert-warning";
        if (elements.alertTitle) elements.alertTitle.textContent = "Moderate Spending Caution";
        if (elements.alertMessage) elements.alertMessage.textContent = `You have consumed ${percent.toFixed(1)}% of your monthly budget. You have ${formatCurrency(remaining)} remaining. Plan upcoming transactions carefully.`;
        if (alertIconEl) alertIconEl.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
        if (elements.riskBadge) {
            elements.riskBadge.textContent = "MODERATE RISK";
            elements.riskBadge.className = "risk-badge badge-moderate-risk";
        }
        if (state.lastAlertLevel !== "moderate") {
            playAlertChime(false, true);
            showToast(`Heads up: you've used ${percent.toFixed(0)}% of your budget.`, "info");
            state.lastAlertLevel = "moderate";
        }

    } else {
        // Safe spending zone
        elements.alertBanner.className = "budget-alert-banner alert-safe";
        if (elements.alertTitle) elements.alertTitle.textContent = "Budget Health: Safe & On Track";
        if (elements.alertMessage) elements.alertMessage.textContent = `Great financial discipline! You have used ${percent.toFixed(1)}% of your budget with ${formatCurrency(remaining)} remaining.`;
        if (alertIconEl) alertIconEl.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
        if (elements.riskBadge) {
            elements.riskBadge.textContent = "LOW RISK";
            elements.riskBadge.className = "risk-badge badge-low-risk";
        }
        state.lastAlertLevel = "safe";
    }
}

// ==========================================================================
// Notifications & Web Audio Synthesizer Alerts
// ==========================================================================

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        showToast("Your browser does not support desktop notifications", "warning");
        return;
    }
    Notification.requestPermission().then(permission => {
        updateNotificationButtonState();
        if (permission === "granted") {
            showToast("Desktop budget alerts enabled!", "success");
            sendDesktopAlert("SpendFlow Alerts Activated ✓", "You will now receive desktop notifications if spending approaches or exceeds your monthly budget limit.");
        } else {
            showToast("Desktop notifications were declined", "info");
        }
    });
}

function updateNotificationButtonState() {
    if (!elements.enableNotificationsBtn) return;
    if (!("Notification" in window)) {
        elements.enableNotificationsBtn.style.display = "none";
        return;
    }
    if (Notification.permission === "granted") {
        elements.enableNotificationsBtn.innerHTML = '<i class="fa-solid fa-check"></i> Alerts Active';
        elements.enableNotificationsBtn.title = "Desktop notifications are enabled and active";
    } else {
        elements.enableNotificationsBtn.innerHTML = '<i class="fa-solid fa-bell"></i> Enable Alerts';
        elements.enableNotificationsBtn.title = "Click to enable desktop notifications for budget limits";
    }
}

function sendDesktopAlert(title, message) {
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            new Notification(title, {
                body: message,
                icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%237c3aed'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'/></svg>"
            });
        } catch (e) {
            console.warn("Desktop notification error:", e);
        }
    }
}

let activeAlertAudioCtx = null;
let activeAlertOsc = null;

function stopCurrentAlertSound() {
    try {
        if (activeAlertOsc) {
            activeAlertOsc.stop();
            activeAlertOsc.disconnect();
            activeAlertOsc = null;
        }
        if (activeAlertAudioCtx) {
            activeAlertAudioCtx.close();
            activeAlertAudioCtx = null;
        }
    } catch (e) {
        // ignore
    }
}

function playAlertChime(isCritical = false, isModerate = false, isHighRisk = false) {
    try {
        // Stop any previously playing sound before starting fresh
        stopCurrentAlertSound();

        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtxClass) return;
        const ctx = new AudioCtxClass();
        activeAlertAudioCtx = ctx;

        if (ctx.state === "suspended") {
            ctx.resume();
        }

        const t0 = ctx.currentTime + 0.02;
        const totalDuration = isHighRisk ? 0.8 : isModerate ? 0.48 : 3.5;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        activeAlertOsc = osc;

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (isCritical) {
            // Urgent continuous two-tone alarm siren lasting 3.5 seconds
            osc.type = "sawtooth";
            const pulsePeriod = 0.25; // 4 alarm beeps per second
            const pulseCount = Math.floor(totalDuration / pulsePeriod); // ~14 beeps across 3.5s
            const vol = 0.22;

            for (let i = 0; i < pulseCount; i++) {
                const startTime = t0 + i * pulsePeriod;
                // Alternate between high & low alert frequencies (780 Hz and 580 Hz)
                const freq = (i % 2 === 0) ? 780 : 580;
                osc.frequency.setValueAtTime(freq, startTime);

                // Sharp attack and pulse envelope
                gain.gain.setValueAtTime(vol, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.20);
            }

            osc.start(t0);
            osc.stop(t0 + totalDuration);

        } else if (isHighRisk) {
            // Two brief warning beeps for high-risk spending.
            osc.type = "sine";
            const beepPeriod = 0.4;
            const beepCount = 2;
            const vol = 0.1;

            for (let i = 0; i < beepCount; i++) {
                const startTime = t0 + i * beepPeriod;
                osc.frequency.setValueAtTime(740, startTime);
                gain.gain.setValueAtTime(vol, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
            }

            osc.start(t0);
            osc.stop(t0 + totalDuration);

        } else if (isModerate) {
            // A brief, quiet heads-up chime for moderate spending.
            osc.type = "sine";
            const notes = [523.25, 659.25];
            const notePeriod = 0.24;
            const vol = 0.045;

            notes.forEach((freq, i) => {
                const startTime = t0 + i * notePeriod;
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(vol, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.20);
            });

            osc.start(t0);
            osc.stop(t0 + totalDuration);

        } else {
            // Melodic caution chime sequence looping continuously for 3.5 seconds
            osc.type = "sine";
            const notes = [587.33, 659.25, 739.99, 880.00]; // D5, E5, F#5, A5
            const chimePeriod = 0.30;
            const chimeCount = Math.floor(totalDuration / chimePeriod); // ~11 chimes across 3.5s
            const vol = 0.18;

            for (let i = 0; i < chimeCount; i++) {
                const startTime = t0 + i * chimePeriod;
                const freq = notes[i % notes.length];
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(vol, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.24);
            }

            osc.start(t0);
            osc.stop(t0 + totalDuration);
        }

        osc.onended = () => {
            if (activeAlertOsc === osc) {
                stopCurrentAlertSound();
            }
        };

    } catch (e) {
        console.warn("Audio alert could not be played:", e);
    }
}

// ==========================================================================
// Expense List Rendering (expenses.html)
// ==========================================================================

function renderExpensesList() {
    if (!elements.expenseList) return;

    // Filter expenses by search query and category
    let filtered = state.expenses.filter(item => {
        const matchesCategory = (state.categoryFilter === "ALL" || item.category === state.categoryFilter);
        const matchesSearch = !state.searchQuery || 
            item.title.toLowerCase().includes(state.searchQuery) ||
            item.category.toLowerCase().includes(state.searchQuery) ||
            (item.paymentMethod && item.paymentMethod.toLowerCase().includes(state.searchQuery)) ||
            item.amount.toString().includes(state.searchQuery);
        return matchesCategory && matchesSearch;
    });

    // Sort expenses
    filtered.sort((a, b) => {
        if (state.sortBy === "date-desc") return new Date(b.date) - new Date(a.date);
        if (state.sortBy === "date-asc") return new Date(a.date) - new Date(b.date);
        if (state.sortBy === "amount-desc") return b.amount - a.amount;
        if (state.sortBy === "amount-asc") return a.amount - b.amount;
        return 0;
    });

    // Update counters
    if (elements.visibleCount) elements.visibleCount.textContent = filtered.length;
    if (elements.totalCount) elements.totalCount.textContent = state.expenses.length;

    const filteredSum = filtered.reduce((sum, item) => sum + Number(item.amount), 0);
    if (elements.filteredTotal) elements.filteredTotal.textContent = formatCurrency(filteredSum);

    // Render list or empty state
    elements.expenseList.innerHTML = "";

    if (filtered.length === 0) {
        if (elements.emptyState) elements.emptyState.classList.remove("hidden");
        const emptyTitle = document.getElementById("empty-state-title");
        const emptyDesc = document.getElementById("empty-state-desc");
        if (state.searchQuery || state.categoryFilter !== "ALL") {
            if (emptyTitle) emptyTitle.textContent = "No matching expenses";
            if (emptyDesc) emptyDesc.textContent = "Try adjusting your search query or category filter.";
        } else {
            if (emptyTitle) emptyTitle.textContent = "No expenses recorded yet";
            if (emptyDesc) emptyDesc.textContent = "Log your first expense using the form on the left!";
        }
    } else {
        if (elements.emptyState) elements.emptyState.classList.add("hidden");
        filtered.forEach(expense => {
            const itemEl = createExpenseItemElement(expense);
            elements.expenseList.appendChild(itemEl);
        });
    }
}

function createExpenseItemElement(expense) {
    const li = document.createElement("li");
    li.className = "expense-item";

    const meta = CATEGORY_META[expense.category] || CATEGORY_META["Other"];
    const formattedDate = formatDateDisplay(expense.date);

    li.innerHTML = `
        <div class="expense-left">
            <div class="category-icon-avatar" style="background-color: ${meta.bg}; color: ${meta.color};">
                <i class="fa-solid ${meta.icon}"></i>
            </div>
            <div class="expense-info">
                <h4>${escapeHtml(expense.title)}</h4>
                <div class="expense-meta">
                    <span class="meta-badge">${escapeHtml(expense.category)}</span>
                    <span><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
                    ${expense.paymentMethod ? `<span>&bull; ${escapeHtml(expense.paymentMethod)}</span>` : ""}
                </div>
            </div>
        </div>
        <div class="expense-right">
            <div class="expense-amount-display">${formatCurrency(expense.amount)}</div>
            <button class="edit-expense-btn" type="button" title="Edit expense" aria-label="Edit ${escapeHtml(expense.title)}">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button class="delete-expense-btn" title="Delete expense" data-id="${expense.id}" aria-label="Delete ${escapeHtml(expense.title)}">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        </div>
    `;

    // Attach delete event
    const editBtn = li.querySelector(".edit-expense-btn");
    editBtn.addEventListener("click", () => startExpenseEdit(expense.id));
    const deleteBtn = li.querySelector(".delete-expense-btn");
    deleteBtn.addEventListener("click", () => handleDeleteExpense(expense.id));

    return li;
}

// ==========================================================================
// Category Analytics & Chart.js Visuals (categories.html)
// ==========================================================================

function renderCategoryBreakdown() {
    const categoryTotals = {};
    let grandTotal = 0;

    state.expenses.forEach(item => {
        const cat = item.category || "Other";
        const amt = Number(item.amount) || 0;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
        grandTotal += amt;
    });

    const categories = Object.keys(categoryTotals);
    categories.sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    // Update category-detail-card amounts on categories.html if present
    document.querySelectorAll(".category-detail-card").forEach(card => {
        const pill = card.querySelector(".category-badge-pill");
        if (pill) {
            const cardCatText = pill.textContent.trim();
            for (const catName of Object.keys(CATEGORY_META)) {
                if (cardCatText.includes(catName)) {
                    let amtEl = card.querySelector(".category-detail-amount");
                    if (!amtEl) {
                        amtEl = document.createElement("div");
                        amtEl.className = "category-detail-amount";
                        const header = card.querySelector(".category-detail-header");
                        if (header) header.appendChild(amtEl);
                    }
                    const amt = categoryTotals[catName] || 0;
                    amtEl.textContent = formatCurrency(amt);
                    break;
                }
            }
        }
    });

    // If neither chart canvas nor bars list container is on this page, exit early
    if (!elements.categoryChartCanvas && !elements.categoryBarsContainer) {
        return;
    }

    // Empty state for chart if no expenses
    if (categories.length === 0 || grandTotal === 0) {
        if (elements.chartEmptyState) elements.chartEmptyState.classList.remove("hidden");
        if (elements.categoryChartCanvas) elements.categoryChartCanvas.style.display = "none";
        if (elements.categoryBarsContainer) elements.categoryBarsContainer.innerHTML = "";
        if (state.chartInstance) {
            state.chartInstance.destroy();
            state.chartInstance = null;
        }
        return;
    }

    if (elements.chartEmptyState) elements.chartEmptyState.classList.add("hidden");
    if (elements.categoryChartCanvas) elements.categoryChartCanvas.style.display = "block";

    const labels = categories;
    const dataValues = categories.map(cat => categoryTotals[cat]);
    const backgroundColors = categories.map(cat => (CATEGORY_META[cat] ? CATEGORY_META[cat].color : "#7c3aed"));

    // Render / Update Chart.js Doughnut
    if (elements.categoryChartCanvas && window.Chart) {
        if (state.chartInstance) {
            state.chartInstance.data.labels = labels;
            state.chartInstance.data.datasets[0].data = dataValues;
            state.chartInstance.data.datasets[0].backgroundColor = backgroundColors;
            state.chartInstance.update();
        } else {
            const ctx = elements.categoryChartCanvas.getContext("2d");
            state.chartInstance = new Chart(ctx, {
                type: "doughnut",
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataValues,
                        backgroundColor: backgroundColors,
                        borderWidth: 3,
                        borderColor: "#ffffff",
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const val = context.raw || 0;
                                    const pct = grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : 0;
                                    return ` ${context.label}: ${state.currency}${val.toLocaleString("en-IN", {minimumFractionDigits: 2})} (${pct}%)`;
                                }
                            }
                        }
                    },
                    cutout: "72%"
                }
            });
        }
    }

    // Render Category Breakdown Progress Bars List
    if (elements.categoryBarsContainer) {
        elements.categoryBarsContainer.innerHTML = "";
        categories.forEach(cat => {
            const amt = categoryTotals[cat];
            const pct = ((amt / grandTotal) * 100).toFixed(1);
            const meta = CATEGORY_META[cat] || CATEGORY_META["Other"];

            const item = document.createElement("div");
            item.className = "category-bar-item";
            item.innerHTML = `
                <div class="cat-bar-header">
                    <div class="cat-name-group">
                        <i class="fa-solid ${meta.icon}" style="color: ${meta.color}"></i>
                        <span>${escapeHtml(cat)}</span>
                    </div>
                    <div class="cat-bar-amount">${formatCurrency(amt)} <span style="font-weight: 500; font-size: 0.72rem; color: var(--gray-500);">(${pct}%)</span></div>
                </div>
                <div class="cat-bar-track">
                    <div class="cat-bar-fill" style="width: ${pct}%; background-color: ${meta.color};"></div>
                </div>
            `;
            elements.categoryBarsContainer.appendChild(item);
        });
    }
}

function renderMonthlyTrends() {
    if (!elements.monthlyTrendCanvas) return;

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        return {
            key: `${year}-${String(month + 1).padStart(2, "0")}`,
            label: monthDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })
        };
    });
    const monthlyTotals = new Map(months.map(month => [month.key, 0]));

    state.expenses.forEach(expense => {
        if (typeof expense.date !== "string") return;
        const monthKey = expense.date.slice(0, 7);
        if (monthlyTotals.has(monthKey)) {
            monthlyTotals.set(monthKey, monthlyTotals.get(monthKey) + (Number(expense.amount) || 0));
        }
    });

    const totals = months.map(month => monthlyTotals.get(month.key));
    const hasRecentSpending = totals.some(amount => amount > 0);

    if (!hasRecentSpending) {
        elements.monthlyTrendCanvas.style.display = "none";
        if (elements.monthlyTrendEmptyState) elements.monthlyTrendEmptyState.classList.remove("hidden");
        if (elements.monthlyTrendSummary) elements.monthlyTrendSummary.textContent = "";
        if (state.monthlyTrendChart) {
            state.monthlyTrendChart.destroy();
            state.monthlyTrendChart = null;
        }
        return;
    }

    elements.monthlyTrendCanvas.style.display = "block";
    if (elements.monthlyTrendEmptyState) elements.monthlyTrendEmptyState.classList.add("hidden");

    const currentTotal = totals[totals.length - 1];
    const previousTotal = totals[totals.length - 2];
    const previousMonth = months[months.length - 2].label;
    if (elements.monthlyTrendSummary) {
        if (currentTotal === previousTotal) {
            elements.monthlyTrendSummary.textContent = `Your spending is unchanged from ${previousMonth} at ${formatCurrency(currentTotal)}.`;
        } else if (previousTotal === 0) {
            elements.monthlyTrendSummary.textContent = currentTotal > 0
                ? `You've spent ${formatCurrency(currentTotal)} this month, compared with no recorded spending in ${previousMonth}.`
                : `No spending recorded this month or in ${previousMonth}.`;
        } else {
            const direction = currentTotal > previousTotal ? "increased" : "decreased";
            elements.monthlyTrendSummary.textContent = `Your spending ${direction} by ${formatCurrency(Math.abs(currentTotal - previousTotal))} compared with ${previousMonth}.`;
        }
    }

    if (!window.Chart) return;

    const chartData = {
        labels: months.map(month => month.label),
        datasets: [{
            label: "Monthly spending",
            data: totals,
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139, 92, 246, 0.12)",
            pointBackgroundColor: "#8b5cf6",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.35
        }]
    };

    if (state.monthlyTrendChart) {
        state.monthlyTrendChart.data = chartData;
        state.monthlyTrendChart.update();
        return;
    }

    state.monthlyTrendChart = new Chart(elements.monthlyTrendCanvas.getContext("2d"), {
        type: "line",
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context => ` ${formatCurrency(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `${state.currency}${Number(value).toLocaleString("en-IN")}`
                    }
                }
            }
        }
    });
}

// ==========================================================================
// Dashboard Mini Previews (index.html)
// ==========================================================================

function renderDashboardPreviews() {
    const recentPreview = document.getElementById("recent-expenses-preview");
    const topCategories = document.getElementById("dashboard-top-categories");

    if (recentPreview) {
        if (state.expenses.length === 0) {
            recentPreview.innerHTML = `
                <div class="empty-state-mini">
                    <i class="fa-solid fa-receipt"></i>
                    <p>No expenses recorded yet.</p>
                    <a href="expenses.html" class="btn btn-sm btn-primary" style="margin-top: 0.65rem;">
                        <i class="fa-solid fa-plus"></i> Add First Expense
                    </a>
                </div>
            `;
        } else {
            // Sort by date descending
            const sorted = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
            const recentFour = sorted.slice(0, 4);

            recentPreview.innerHTML = recentFour.map(item => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META["Other"];
                return `
                    <div class="recent-expense-row">
                        <div class="recent-expense-left">
                            <div class="recent-cat-icon" style="background: ${meta.bg}; color: ${meta.color};">
                                <i class="fa-solid ${meta.icon}"></i>
                            </div>
                            <div>
                                <div class="recent-expense-title">${escapeHtml(item.title)}</div>
                                <div class="recent-expense-sub">
                                    <span>${escapeHtml(item.category)}</span> &bull; 
                                    <span>${formatDateDisplay(item.date)}</span>
                                    ${item.paymentMethod ? ` &bull; <span>${escapeHtml(item.paymentMethod)}</span>` : ""}
                                </div>
                            </div>
                        </div>
                        <div class="recent-expense-amount">
                            -${formatCurrency(item.amount)}
                        </div>
                    </div>
                `;
            }).join("");
        }
    }

    if (topCategories) {
        const categoryTotals = {};
        let grandTotal = 0;

        state.expenses.forEach(item => {
            const cat = item.category || "Other";
            const amt = Number(item.amount) || 0;
            categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
            grandTotal += amt;
        });

        const categories = Object.keys(categoryTotals);

        if (categories.length === 0 || grandTotal === 0) {
            topCategories.innerHTML = `
                <div class="empty-state-mini">
                    <i class="fa-solid fa-chart-pie"></i>
                    <p>No category spending data yet.</p>
                    <a href="categories.html" class="btn btn-sm btn-secondary" style="margin-top: 0.65rem;">
                        <i class="fa-solid fa-chart-pie"></i> Explore Categories
                    </a>
                </div>
            `;
        } else {
            categories.sort((a, b) => categoryTotals[b] - categoryTotals[a]);
            const topFour = categories.slice(0, 4);

            topCategories.innerHTML = topFour.map(cat => {
                const amt = categoryTotals[cat];
                const pct = ((amt / grandTotal) * 100).toFixed(1);
                const meta = CATEGORY_META[cat] || CATEGORY_META["Other"];

                return `
                    <div class="mini-category-row">
                        <div class="mini-cat-header">
                            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; color: var(--gray-800);">
                                <i class="fa-solid ${meta.icon}" style="color: ${meta.color};"></i>
                                <span>${escapeHtml(cat)}</span>
                            </div>
                            <div style="font-size: 0.825rem; font-weight: 700; color: var(--gray-700);">
                                ${formatCurrency(amt)} <span style="font-weight: 500; font-size: 0.725rem; color: var(--gray-500);">(${pct}%)</span>
                            </div>
                        </div>
                        <div class="mini-cat-bar-bg">
                            <div class="mini-cat-bar-fill" style="width: ${pct}%; background-color: ${meta.color};"></div>
                        </div>
                    </div>
                `;
            }).join("");
        }
    }
}

function findUnusualExpenses() {
    const now = new Date();
    const recentCutoff = getLocalDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
    const today = getLocalDateKey(now);
    return state.expenses
        .filter(expense => typeof expense.date === "string" && expense.date >= recentCutoff && expense.date <= today)
        .map(expense => {
            const comparisonStart = new Date(`${expense.date}T00:00:00`);
            comparisonStart.setDate(comparisonStart.getDate() - 90);
            const startKey = getLocalDateKey(comparisonStart);
            const historicalAmounts = state.expenses
                .filter(item => item !== expense &&
                    item.category === expense.category &&
                    typeof item.date === "string" &&
                    item.date >= startKey &&
                    item.date < expense.date)
                .map(item => Number(item.amount))
                .filter(amount => Number.isFinite(amount) && amount > 0)
                .sort((a, b) => a - b);
            if (historicalAmounts.length < 3) return null;
            const middle = Math.floor(historicalAmounts.length / 2);
            const median = historicalAmounts.length % 2
                ? historicalAmounts[middle]
                : (historicalAmounts[middle - 1] + historicalAmounts[middle]) / 2;
            const amount = Number(expense.amount);
            if (amount < median * 2 || amount - median < Math.max(500, median * 0.5)) return null;
            return { expense, median, ratio: amount / median };
        })
        .filter(Boolean)
        .sort((a, b) => b.expense.date.localeCompare(a.expense.date))
        .slice(0, 5);
}

async function ensureUnusualSpendingNotifications() {
    const unusualExpenses = findUnusualExpenses();
    const newNotifications = [];
    for (const match of unusualExpenses) {
        const { expense, median, ratio } = match;
        const message = `Unusual spending on ${expense.date}: ${expense.title || "Expense"} in ${expense.category || "Other"} was ${ratio.toFixed(1)}x your recent median (${formatCurrency(median)}).`;
        const exists = state.notifications.some(notification =>
            notification.type === "UNUSUAL_SPENDING" && notification.message === message
        );
        if (exists) continue;

        if (state.backendConnected) {
            try {
                const response = await fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "UNUSUAL_SPENDING", message })
                });
                if (!response.ok) throw new Error(`Saving the unusual-spending alert failed (${response.status}).`);
                newNotifications.push(await response.json());
            } catch (error) {
                console.error("Could not persist unusual-spending alert:", error);
                showToast("An unusual expense was detected, but its alert could not be saved.", "warning");
            }
        } else {
            newNotifications.push({
                id: `unusual-${expense.id || `${expense.date}-${expense.title}`}`,
                type: "UNUSUAL_SPENDING",
                message,
                read: false,
                createdAt: new Date().toISOString()
            });
        }
    }

    if (newNotifications.length) {
        const uniqueById = new Map(state.notifications.map(notification => [String(notification.id), notification]));
        newNotifications.forEach(notification => uniqueById.set(String(notification.id), notification));
        state.notifications = Array.from(uniqueById.values())
            .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        saveLocalCollection("spendflow_notifications", state.notifications);
        renderNotifications();
        if (elements.unusualSpendingContent) {
            showToast(`${newNotifications.length} unusual spending alert${newNotifications.length === 1 ? "" : "s"} added to Notifications.`, "warning");
        }
    }
}

function renderFinancialInsights() {
    const currentMonth = getCurrentMonthKey();
    const monthExpenses = state.expenses.filter(expense =>
        typeof expense.date === "string" && expense.date.slice(0, 7) === currentMonth
    );
    const monthSpent = monthExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    const today = new Date();
    const daysElapsed = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const forecast = daysElapsed > 0 ? monthSpent / daysElapsed * daysInMonth : 0;
    const unusual = findUnusualExpenses();

    if (elements.unusualSpendingContent) {
        elements.unusualSpendingContent.innerHTML = unusual.length
            ? unusual.slice(0, 2).map(({ expense, median, ratio }) => `
                <p class="insight-suggestion insight-alert">
                    <strong>${escapeHtml(expense.title || "Expense")}</strong> is ${ratio.toFixed(1)}x the recent ${escapeHtml(expense.category || "Other")} median (${formatCurrency(median)}).
                </p>
            `).join("")
            : `<p class="insight-supporting-text">${state.expenses.length < 3
                ? "Add a few expenses in the same category to build a useful baseline."
                : "No unusually large recent expenses found against your 90-day category history."}</p>`;
    }

    if (elements.forecastContent) {
        const remaining = state.budget - forecast;
        elements.forecastContent.innerHTML = `
            <div class="insight-primary-value">${formatCurrency(forecast)}</div>
            <p class="insight-supporting-text">Estimated total by month-end, based on ${daysElapsed} days of recorded spending.</p>
            ${state.budget > 0
                ? `<p class="insight-suggestion ${remaining < 0 ? "insight-danger" : remaining < state.budget * 0.2 ? "insight-alert" : ""}">
                    ${remaining >= 0
                        ? `${formatCurrency(remaining)} projected under your monthly budget.`
                        : `Projected ${formatCurrency(Math.abs(remaining))} over your monthly budget.`}
                </p>`
                : '<p class="insight-supporting-text">Set a monthly budget to compare this forecast against your limit.</p>'}
        `;
    }

    if (elements.financialHealthContent) {
        const budgetPoints = state.budget > 0
            ? monthSpent <= state.budget * 0.8 ? 35 : monthSpent <= state.budget ? 23 : 8
            : 0;
        const categoryEntries = Object.entries(state.categoryBudgets);
        const categoryPoints = categoryEntries.length
            ? categoryEntries.every(([category, limit]) => {
                const spent = monthExpenses
                    .filter(expense => expense.category === category)
                    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
                return spent <= Number(limit);
            }) ? 25 : 8
            : 12;
        const goalProgress = state.savingsGoals.length
            ? state.savingsGoals.reduce((sum, goal) =>
                sum + Math.min(Number(goal.saved) / Math.max(Number(goal.target), 1), 1), 0) / state.savingsGoals.length
            : null;
        const savingsPoints = goalProgress === null ? 12 : Math.round(goalProgress * 25);
        const trackingPoints = monthExpenses.length >= 5 ? 15 : 8;
        const score = budgetPoints + categoryPoints + savingsPoints + trackingPoints;
        const suggestions = [];
        if (state.budget <= 0) suggestions.push("Set a monthly budget to include budget progress in this guide.");
        else if (monthSpent > state.budget) suggestions.push("Review this month’s spending and adjust upcoming non-essential purchases.");
        else if (monthSpent > state.budget * 0.8) suggestions.push("You are nearing your monthly limit; check the forecast before larger purchases.");
        if (!categoryEntries.length) suggestions.push("Set category limits to make your spending plan more specific.");
        else if (categoryPoints < 20) suggestions.push("At least one category has passed its monthly limit.");
        if (!state.savingsGoals.length) suggestions.push("Create a savings goal to track progress toward something important.");
        else if (goalProgress < 0.25) suggestions.push("Try setting a small, regular contribution toward a savings goal.");
        if (monthExpenses.length < 5) suggestions.push("Record expenses regularly for a more reliable picture of your month.");
        if (!suggestions.length) suggestions.push("Your recorded spending is within the limits you set. Keep reviewing it regularly.");

        elements.financialHealthContent.innerHTML = `
            <div class="insight-primary-value">${score}<span class="insight-score-suffix"> / 100</span></div>
            <p class="insight-supporting-text">Based on budget use, category limits, savings progress, and recorded activity.</p>
            <ul class="insight-suggestion-list">${suggestions.slice(0, 3).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        `;
    }
}

function renderSharedExpenseOptions() {
    if (!elements.sharedSplitExpense) return;
    const selected = elements.sharedSplitExpense.value;
    elements.sharedSplitExpense.innerHTML = `<option value="" disabled ${selected ? "" : "selected"}>Choose an expense</option>` +
        state.expenses.map(expense => `
            <option value="${escapeHtml(String(expense.id))}" ${String(expense.id) === selected ? "selected" : ""}>
                ${escapeHtml(expense.title || "Untitled expense")} · ${formatCurrency(expense.amount)} · ${formatDateDisplay(expense.date)}
            </option>
        `).join("");
}

function renderSharedExpenses() {
    if (!elements.sharedSplitsList) return;
    if (!state.sharedExpenses.length) {
        elements.sharedSplitsList.innerHTML = '<p class="notification-empty">Your saved shared expenses will appear here.</p>';
        return;
    }
    elements.sharedSplitsList.innerHTML = state.sharedExpenses.map(shared => `
        <article class="shared-split-item">
            <h3>${escapeHtml(shared.title)}</h3>
            <p>${formatDateDisplay(shared.date)} · Total ${formatCurrency(shared.totalAmount)} split ${shared.participants.length} ways</p>
            <p>${shared.participants.map(participant => `${escapeHtml(participant.name)}: ${formatCurrency(participant.shareAmount)}`).join(" · ")}</p>
            <button type="button" class="notification-read-btn" data-shared-expense-delete="${escapeHtml(String(shared.id))}">Remove split</button>
        </article>
    `).join("");
}

async function handleCreateSharedSplit(event) {
    event.preventDefault();
    const expense = state.expenses.find(item => String(item.id) === elements.sharedSplitExpense.value);
    const names = elements.sharedSplitPeople.value.split(",").map(name => name.trim()).filter(Boolean);
    const uniqueNames = new Set(names.map(name => name.toLocaleLowerCase()));
    if (!expense || names.length < 2 || names.length > 50 || uniqueNames.size !== names.length ||
        names.some(name => name.length > 120)) {
        showToast("Choose an expense and enter 2–50 unique names (up to 120 characters each), separated by commas.", "error");
        return;
    }
    const totalCents = Math.round(Number(expense.amount) * 100);
    const baseCents = Math.floor(totalCents / names.length);
    let remainder = totalCents % names.length;
    const participants = names.map(name => {
        const shareCents = baseCents + (remainder-- > 0 ? 1 : 0);
        return { name, shareAmount: (shareCents / 100).toFixed(2) };
    });
    const split = {
        title: expense.title,
        totalAmount: totalCents / 100,
        currency: state.currency,
        date: expense.date,
        participants
    };

    if (state.backendConnected) {
        try {
            const response = await fetch("/api/shared-expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: split.title,
                    totalAmount: split.totalAmount,
                    currency: split.currency,
                    date: split.date,
                    participants: names.map(name => ({ name }))
                })
            });
            if (!response.ok) throw new Error(`Saving the split failed (${response.status}).`);
            state.sharedExpenses.unshift(await response.json());
        } catch (error) {
            console.error("Could not save shared expense:", error);
            showToast("Could not save this split to your account.", "error");
            return;
        }
    } else {
        split.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        state.sharedExpenses.unshift(split);
        saveLocalCollection("spendflow_shared_expenses", state.sharedExpenses);
    }
    elements.sharedSplitForm.reset();
    renderSharedExpenses();
    showToast("Equal split saved. No money was transferred.", "success");
}

async function handleSharedExpenseAction(event) {
    const button = event.target.closest("[data-shared-expense-delete]");
    if (!button) return;
    const id = button.dataset.sharedExpenseDelete;
    if (!window.confirm("Remove this saved expense split?")) return;
    if (state.backendConnected) {
        try {
            const response = await fetch(`/api/shared-expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
            if (!response.ok) throw new Error(`Removing the split failed (${response.status}).`);
        } catch (error) {
            console.error("Could not remove shared expense:", error);
            showToast("Could not remove this split from your account.", "error");
            return;
        }
    }
    state.sharedExpenses = state.sharedExpenses.filter(shared => String(shared.id) !== String(id));
    saveLocalCollection("spendflow_shared_expenses", state.sharedExpenses);
    renderSharedExpenses();
}

function renderNotifications() {
    if (!elements.notificationList) return;
    const notifications = [...state.notifications]
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, 8);
    if (!notifications.length) {
        elements.notificationList.innerHTML = '<p class="notification-empty">You’re all caught up. Budget and unusual-spending alerts will show here.</p>';
        return;
    }
    elements.notificationList.innerHTML = notifications.map(notification => {
        const created = notification.createdAt ? new Date(notification.createdAt) : null;
        const dateLabel = created && !Number.isNaN(created.getTime())
            ? created.toLocaleString()
            : "Recently";
        const isRead = Boolean(notification.read);
        return `
            <article class="notification-item${isRead ? "" : " unread"}">
                <div class="notification-copy">
                    <strong>${escapeHtml(String(notification.type || "UPDATE").replace(/_/g, " "))}</strong>
                    <p>${escapeHtml(notification.message || "")}</p>
                    <time>${escapeHtml(dateLabel)}</time>
                </div>
                ${isRead ? "" : `<button type="button" class="notification-read-btn" data-notification-read="${escapeHtml(String(notification.id))}">Mark read</button>`}
            </article>
        `;
    }).join("");
}

async function handleNotificationAction(event) {
    const button = event.target.closest("[data-notification-read]");
    if (!button) return;
    const notification = state.notifications.find(item => String(item.id) === button.dataset.notificationRead);
    if (!notification || notification.read) return;
    if (state.backendConnected) {
        try {
            const response = await fetch(`/api/notifications/${encodeURIComponent(notification.id)}/read`, { method: "PUT" });
            if (!response.ok) throw new Error(`Marking notification read failed (${response.status}).`);
            notification.read = true;
        } catch (error) {
            console.error("Could not mark notification as read:", error);
            showToast("Could not update this notification.", "error");
            return;
        }
    } else {
        notification.read = true;
        saveLocalCollection("spendflow_notifications", state.notifications);
    }
    renderNotifications();
}

async function refreshNotifications() {
    if (!state.backendConnected) {
        loadLocalFinancialData();
        return;
    }
    try {
        const response = await fetch("/api/notifications");
        if (!response.ok) throw new Error(`Refreshing notifications failed (${response.status}).`);
        state.notifications = await response.json();
        renderNotifications();
    } catch (error) {
        console.error("Could not refresh notifications:", error);
        showToast("Notifications could not be refreshed.", "error");
    }
}

function renderSavingsGoals() {
    if (!elements.savingsGoalsList || !elements.savingsGoalsEmpty) return;

    elements.savingsGoalsEmpty.classList.toggle("hidden", state.savingsGoals.length > 0);
    elements.savingsGoalsList.innerHTML = state.savingsGoals.map(goal => {
        const target = Number(goal.target);
        const saved = Number(goal.saved);
        const progress = Math.min((saved / target) * 100, 100);
        const remaining = Math.max(target - saved, 0);
        const isComplete = saved >= target;
        const deadlineLabel = goal.deadline
            ? `Target date: ${formatDateDisplay(goal.deadline)}`
            : "No target date";

        return `
            <article class="savings-goal-card${isComplete ? " goal-complete" : ""}">
                <div class="savings-goal-heading">
                    <div class="savings-goal-icon"><i class="fa-solid ${isComplete ? "fa-circle-check" : "fa-star"}"></i></div>
                    <div class="savings-goal-name-wrap">
                        <h3>${escapeHtml(goal.name)}</h3>
                        <p>${isComplete ? "Goal reached — well done!" : escapeHtml(deadlineLabel)}</p>
                    </div>
                    <button type="button" class="goal-delete-btn" data-goal-action="delete" data-goal-id="${escapeHtml(goal.id)}" aria-label="Delete goal ${escapeHtml(goal.name)}" title="Delete goal">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
                <div class="savings-goal-progress-copy">
                    <strong>${formatCurrency(saved)}</strong>
                    <span>${progress.toFixed(0)}% of ${formatCurrency(target)}</span>
                </div>
                <div class="savings-goal-progress-track" role="progressbar" aria-label="${escapeHtml(goal.name)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}">
                    <div class="savings-goal-progress-fill" style="width: ${progress.toFixed(2)}%;"></div>
                </div>
                <div class="savings-goal-footer">
                    <span>${isComplete ? "You did it!" : `${formatCurrency(remaining)} to go`}</span>
                    ${isComplete ? "" : `
                        <div class="goal-contribution-controls">
                            <label class="sr-only" for="goal-contribution-${escapeHtml(goal.id)}">Contribution for ${escapeHtml(goal.name)}</label>
                            <input type="number" id="goal-contribution-${escapeHtml(goal.id)}" data-contribution-for="${escapeHtml(goal.id)}" min="0.01" step="any" placeholder="Amount" aria-label="Contribution for ${escapeHtml(goal.name)}">
                            <button type="button" class="btn btn-sm btn-secondary" data-goal-action="contribute" data-goal-id="${escapeHtml(goal.id)}">Add</button>
                        </div>
                    `}
                </div>
            </article>
        `;
    }).join("");
}

function renderCategoryBudgets() {
    if (!elements.categoryBudgetsList || !elements.categoryBudgetsEmpty) return;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthSpending = new Map(Object.keys(CATEGORY_META).map(category => [category, 0]));
    state.expenses.forEach(expense => {
        if (typeof expense.date !== "string" || expense.date.slice(0, 7) !== currentMonth) return;
        if (monthSpending.has(expense.category)) {
            monthSpending.set(expense.category, monthSpending.get(expense.category) + (Number(expense.amount) || 0));
        }
    });

    const categories = Object.keys(state.categoryBudgets);
    elements.categoryBudgetsEmpty.classList.toggle("hidden", categories.length > 0);
    elements.categoryBudgetsList.innerHTML = categories.map(category => {
        const limit = Number(state.categoryBudgets[category]);
        const spent = monthSpending.get(category) || 0;
        const percent = limit > 0 ? (spent / limit) * 100 : 0;
        const boundedPercent = Math.min(percent, 100);
        const exceeded = spent >= limit;
        const nearLimit = percent >= 80 && !exceeded;
        const meta = CATEGORY_META[category];
        const statusText = exceeded
            ? `Over limit by ${formatCurrency(spent - limit)}`
            : nearLimit
                ? `${formatCurrency(limit - spent)} left · nearing your limit`
                : `${formatCurrency(limit - spent)} left this month`;
        const statusClass = exceeded ? "category-budget-danger" : nearLimit ? "category-budget-warning" : "category-budget-safe";

        return `
            <article class="category-budget-item ${statusClass}">
                <div class="category-budget-heading">
                    <span class="category-budget-icon" style="color: ${meta.color}; background: ${meta.bg};">
                        <i class="fa-solid ${meta.icon}"></i>
                    </span>
                    <div class="category-budget-name">
                        <h4>${escapeHtml(category)}</h4>
                        <span>${formatCurrency(spent)} of ${formatCurrency(limit)} this month</span>
                    </div>
                    <strong class="category-budget-percent">${Math.round(percent)}%</strong>
                </div>
                <div class="category-budget-track" role="progressbar" aria-label="${escapeHtml(category)} monthly budget" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(boundedPercent)}">
                    <div class="category-budget-fill" style="width: ${boundedPercent.toFixed(2)}%;"></div>
                </div>
                <div class="category-budget-footer">
                    <span>${statusText}</span>
                    <div class="category-budget-actions">
                        <button type="button" class="category-budget-edit" data-category-budget-action="edit" data-category="${escapeHtml(category)}">Edit limit</button>
                        <button type="button" class="category-budget-remove" data-category-budget-action="remove" data-category="${escapeHtml(category)}" aria-label="Remove ${escapeHtml(category)} limit">Remove</button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function changeCalendarMonth(offset) {
    state.calendarMonth = new Date(
        state.calendarMonth.getFullYear(),
        state.calendarMonth.getMonth() + offset,
        1
    );
    state.selectedCalendarDate = getLocalDateKey(state.calendarMonth);
    renderSpendingCalendar();
}

function renderSpendingCalendar() {
    if (!elements.spendingCalendarGrid) return;

    const year = state.calendarMonth.getFullYear();
    const month = state.calendarMonth.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthName = state.calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (elements.calendarMonthLabel) elements.calendarMonthLabel.textContent = monthName;

    const expensesByDay = new Map();
    state.expenses.forEach(expense => {
        if (typeof expense.date !== "string" || !expense.date.startsWith(`${monthKey}-`)) return;
        const dayExpenses = expensesByDay.get(expense.date) || [];
        dayExpenses.push(expense);
        expensesByDay.set(expense.date, dayExpenses);
    });

    const monthTotal = Array.from(expensesByDay.values())
        .flat()
        .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    if (elements.calendarMonthTotal) {
        elements.calendarMonthTotal.textContent = `Total for ${monthName}: ${formatCurrency(monthTotal)}`;
    }

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = getLocalDateKey(new Date());
    const cells = [];

    for (let blank = 0; blank < firstWeekday; blank++) {
        cells.push('<div class="calendar-day-cell calendar-day-blank" role="gridcell" aria-hidden="true"></div>');
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
        const dayExpenses = expensesByDay.get(dateKey) || [];
        const dayTotal = dayExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
        const classes = ["calendar-day-button"];
        if (dayExpenses.length) classes.push("calendar-day-has-spending");
        if (dateKey === state.selectedCalendarDate) classes.push("calendar-day-selected");
        if (dateKey === todayKey) classes.push("calendar-day-today");
        const ariaLabel = dayExpenses.length
            ? `${monthName} ${day}: ${dayExpenses.length} ${dayExpenses.length === 1 ? "expense" : "expenses"}, ${formatCurrency(dayTotal)}`
            : `${monthName} ${day}: no expenses`;
        cells.push(`
            <div class="calendar-day-cell" role="gridcell">
                <button type="button" class="${classes.join(" ")}" data-calendar-date="${dateKey}" aria-label="${escapeHtml(ariaLabel)}" aria-pressed="${dateKey === state.selectedCalendarDate}">
                    <span class="calendar-day-number">${day}</span>
                    ${dayExpenses.length ? `<span class="calendar-day-amount">${formatCurrency(dayTotal)}</span><span class="calendar-day-count">${dayExpenses.length} ${dayExpenses.length === 1 ? "expense" : "expenses"}</span>` : '<span class="calendar-day-empty-label">&nbsp;</span>'}
                </button>
            </div>
        `);
    }

    elements.spendingCalendarGrid.innerHTML = `
        <div class="calendar-weekday" role="columnheader">Sun</div>
        <div class="calendar-weekday" role="columnheader">Mon</div>
        <div class="calendar-weekday" role="columnheader">Tue</div>
        <div class="calendar-weekday" role="columnheader">Wed</div>
        <div class="calendar-weekday" role="columnheader">Thu</div>
        <div class="calendar-weekday" role="columnheader">Fri</div>
        <div class="calendar-weekday" role="columnheader">Sat</div>
        ${cells.join("")}
    `;

    renderCalendarSelectedDay(expensesByDay.get(state.selectedCalendarDate) || []);
}

function renderCalendarSelectedDay(expenses) {
    if (!elements.calendarSelectedDate || !elements.calendarDayExpenses) return;
    const selectedDate = new Date(`${state.selectedCalendarDate}T00:00:00`);
    elements.calendarSelectedDate.textContent = selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    if (!expenses.length) {
        elements.calendarDayExpenses.innerHTML = '<p class="calendar-no-expenses">No expenses recorded for this day.</p>';
        return;
    }

    elements.calendarDayExpenses.innerHTML = `
        <ul class="calendar-expense-list">
            ${expenses.map(expense => `
                <li class="calendar-expense-item">
                    <div class="calendar-expense-info">
                        <strong>${escapeHtml(expense.title || "Untitled expense")}</strong>
                        <span>${escapeHtml(expense.category || "Other")}${expense.paymentMethod ? ` · ${escapeHtml(expense.paymentMethod)}` : ""}</span>
                    </div>
                    <strong class="calendar-expense-amount">${formatCurrency(expense.amount)}</strong>
                </li>
            `).join("")}
        </ul>
        <p class="calendar-day-total">Day total: ${formatCurrency(expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0))}</p>
    `;
}

// ==========================================================================
// Helpers: Currency, Date, Formatting, CSV Export, Toasts
// ==========================================================================

function updateCurrencyDisplays() {
    if (elements.currencyPrefix) elements.currencyPrefix.textContent = state.currency;
    if (elements.modalCurrencySymbol) elements.modalCurrencySymbol.textContent = state.currency;
    if (elements.budgetCurrencyPrefix) elements.budgetCurrencyPrefix.textContent = state.currency;
    if (elements.goalCurrencySymbol) elements.goalCurrencySymbol.textContent = state.currency;
    if (elements.goalCurrencySymbolCopy) elements.goalCurrencySymbolCopy.textContent = state.currency;
    if (elements.categoryBudgetCurrency) elements.categoryBudgetCurrency.textContent = state.currency;
}

function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return `${state.currency}${num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return "";
    try {
        const [yyyy, mm, dd] = dateStr.split("-");
        const dateObj = new Date(yyyy, mm - 1, dd);
        return dateObj.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    } catch (e) {
        return dateStr;
    }
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

function exportExpensesToCSV() {
    if (state.expenses.length === 0) {
        showToast("No expenses to export!", "warning");
        return;
    }

    const headers = ["ID", "Title", "Amount", "Currency", "Category", "Date", "Payment Method"];
    const rows = state.expenses.map(item => [
        item.id,
        `"${(item.title || "").replace(/"/g, '""')}"`,
        item.amount,
        state.currency,
        `"${item.category || ""}"`,
        item.date,
        `"${item.paymentMethod || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SpendFlow_Expenses_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Expenses exported to CSV successfully!", "success");
}

// Toast Notifications System
function showToast(message, type = "info") {
    let container = elements.toastContainer || document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let iconClass = "fa-circle-info";
    if (type === "success") iconClass = "fa-circle-check";
    if (type === "warning") iconClass = "fa-triangle-exclamation";
    if (type === "error") iconClass = "fa-circle-xmark";

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("toast-out");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
