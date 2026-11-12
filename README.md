# 💜 SpendFlow — Personal Expense & Budget Manager

A modern, responsive, and full-stack **Personal Expense & Budget Manager** application built with a **Java (Spring Boot) + MySQL** backend and an **HTML5, Vanilla CSS3, and JavaScript** frontend styled with an elegant purple and white aesthetic.

---

## 🌟 Key Features

- **Expense Management**:
  - Add expenses with title, amount, category, date, and payment method (Credit/Debit Card, Cash, UPI, Bank Transfer).
  - Import outgoing transactions from a downloaded bank or payment-app CSV/TSV statement; review detected entries before importing, with likely duplicates and incoming credits skipped.
  - Scan or upload a receipt image to suggest expense details with browser-based OCR; review everything before saving.
  - Real-time search by keyword, note, or amount.
  - Filter by category (Food & Dining, Shopping, Transport, Bills, Entertainment, Health, Education, Travel, Other).
  - Sort expenses by Newest first, Oldest first, Highest amount, or Lowest amount.
  - Delete individual expenses or clear all records with a confirmation dialog.
- **Budget Tracking & Alerts**:
  - Set and update your monthly spending budget; guest users start with no budget configured.
  - Quick adjust preset buttons (`+500`, `+1,000`, `Set 2k`, `Set 5k`).
  - Real-time calculation of **Total Spending**, **Remaining Balance**, and **Budget Consumption %**.
  - Dynamic status alerts:
    - 🟢 **Safe**: Healthy spending progress.
    - 🟡 **Warning**: Alert banner & amber status when spending reaches **80%** or more of the budget.
    - 🔴 **Danger**: Urgent alert banner & red highlight when spending exceeds **100%** of the budget.
- **Savings Goals**:
  - Create goals with a target amount, optional starting savings, and optional target date.
  - Add contributions, track progress, and get a celebration when a goal is reached.
  - Goals are private to the signed-in account and stored in MySQL in full-stack mode; offline goals stay in account-scoped browser storage.
- **Category Budgets**:
  - Set, update, and remove monthly spending limits for individual categories.
  - Track current-month spending with clear near-limit and over-limit indicators.
  - Category limits are private to the signed-in account and stored in MySQL in full-stack mode.
- **Advanced Financial Insights**:
  - Detect recent category expenses that are at least twice the median of the previous 90 days and at least 500 currency units higher (with at least three prior examples).
  - Forecast month-end spending using the current month’s daily average and compare it with the budget.
  - Show a transparent 100-point financial-health guide with practical suggestions; it is not financial advice.
- **Shared Expenses & Notifications**:
  - Split an existing expense equally among named people, with cent-accurate remainder handling. The app records shares but does not transfer money.
  - View and mark persistent budget and unusual-spending alerts as read.
  - In full-stack mode, shared expenses and notifications are private to the signed-in account and stored in MySQL.
- **Receipt Scanning**:
  - OCR runs in the browser, accepts JPG/PNG/WebP images up to 10 MB, and shows low-confidence/missing-field guidance for manual review.
- **Visual Analytics**:
  - Interactive **Chart.js** Donut Chart showing spending distribution across categories with purple gradient palette.
  - Category breakdown list with visual progress bars and percentage share.
  - Monthly spending calendar with month navigation, daily totals, and selected-day expense details.
  - Spending calendar with month navigation, daily totals, and selected-day expense details.
- **Dual Operating Modes**:
  - **Full-Stack Mode**: Connects directly to Java Spring Boot REST API & MySQL.
  - **Offline / Local Mode**: Uses browser `localStorage` when no server account is signed in or the server is unavailable.
    - Offline financial data is stored per local account (or as guest data) in this browser and is not synced to MySQL.
- **Additional Utilities**:
  - Currency switcher (USD `$`, INR `₹`, EUR `€`, GBP `£`, CAD `C$`, AUD `A$`).
  - One-click **Export to CSV**.
  - Toast notification system for user feedback.
  - Online payments are imported from a statement file; the app does not directly connect to or read bank/payment accounts.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, Vanilla CSS3 (Custom Design System), JavaScript (ES6+), Chart.js |
| **Backend** | Java 17+, Spring Boot 3 (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`) |
| **Database** | MySQL 8.x (`mysql-connector-j`, Hibernate ORM) |
| **Build Tool** | Apache Maven (`pom.xml`) |

---

## 📁 Project Structure

```
personalexpense tracker/
├── welcome.html                    # Welcome & Landing Showcase Page
├── register.html                   # User Registration with Password Strength Meter
├── login.html                      # User Sign In Page
├── index.html                      # Main Expense & Budget Dashboard
├── auth.js                         # Authentication & Form Handling Script
├── script.js                       # Frontend Dashboard Script with API & LocalStorage sync
├── style.css                       # Purple & White responsive stylesheet
├── pom.xml                         # Spring Boot Maven configuration
├── src/
│   ├── main/
│   │   ├── java/com/expense/tracker/
│   │   │   ├── ExpenseTrackerApplication.java  # Main Spring Boot Application
│   │   │   ├── controller/
│   │   │   │   ├── AuthController.java         # REST API: /api/auth (Login & Register)
│   │   │   │   ├── ExpenseController.java      # REST API: /api/expenses
│   │   │   │   └── BudgetController.java       # REST API: /api/budget
│   │   │   ├── model/
│   │   │   │   ├── User.java                   # JPA Entity for registered users
│   │   │   │   ├── Expense.java                # JPA Entity for expenses
│   │   │   │   └── Budget.java                 # JPA Entity for budget limit
│   │   │   ├── repository/
│   │   │   │   ├── UserRepository.java         # Spring Data JPA Repository
│   │   │   │   ├── ExpenseRepository.java      # Spring Data JPA Repository
│   │   │   │   └── BudgetRepository.java       # Spring Data JPA Repository
│   │   │   └── service/
│   │   │       ├── UserService.java            # User authentication service
│   │   │       ├── ExpenseService.java         # Business logic & calculations
│   │   │       └── BudgetService.java          # Budget management service
│   │   └── resources/
│   │       ├── application.properties          # Server & MySQL connection setup
│   │       ├── schema.sql                      # Optional MySQL SQL schema script
│   │       └── static/                         # Static files served by Spring Boot
│   │           ├── welcome.html
│   │           ├── register.html
│   │           ├── login.html
│   │           ├── index.html
│   │           ├── style.css
│   │           ├── auth.js
│   │           └── script.js
└── README.md
```

---

## 🚀 How to Run the Application

### Option A: Run Full-Stack (Spring Boot + MySQL)

1. **Configure MySQL Database**:
   - Ensure your MySQL server is running (e.g. via MySQL Service, XAMPP, or MySQL Workbench).
   - Open `src/main/resources/application.properties` and verify your MySQL credentials:
     ```properties
     spring.datasource.url=jdbc:mysql://localhost:3306/expense_tracker_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
     spring.datasource.username=root
     spring.datasource.password=your_mysql_password
     ```
   *(The database `expense_tracker_db` and tables will be created automatically on startup)*

2. **Run Spring Boot**:
   Open a terminal in the project directory and run:
   ```bash
   mvn spring-boot:run
   ```
   *(Or open this folder in IntelliJ IDEA, Eclipse, or VS Code and run `ExpenseTrackerApplication.java`)*

3. **Open the Web Application**:
   Visit `http://localhost:8080` in your web browser. You will see the **"🟢 Java API & MySQL"** status badge in the header!
   Sign in to the same account on your phone, tablet, and laptop; when online, those devices use the same Spring Boot session API and MySQL account data.

### Install and use SpendFlow offline

- Open SpendFlow through Spring Boot at `http://localhost:8080` (or an HTTPS deployment). PWA installation and service workers do not work from a `file://` double-click.
- Choose **Install** in the header when your browser offers installation, or use the browser’s **Install app / Add to Home Screen** menu. PWA install icons and a web manifest are included.
- After the first online visit, the service worker caches the application shell so its pages remain available offline.
- The connection badge reports online, local-only, or offline status. While offline, changes are saved in that browser only and do not sync automatically; reconnect and reload before expecting to see the account’s shared MySQL data.
- For a phone camera or existing photo, choose **Scan a receipt** and use the device picker’s camera or gallery option.

---

### Option B: Run Frontend Directly (Instant Local Mode)

If you haven't set up Java or MySQL yet, you can immediately open `index.html` in your web browser:
- Double-click `index.html` or open it with Chrome/Firefox/Edge.
- The application will automatically detect offline mode and store all data securely in your browser's **LocalStorage** with the **"🟣 Local Mode"** badge.

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/expenses` | Get all expenses (supports `?search=` and `?category=`) |
| `POST` | `/api/expenses` | Create a new expense |
| `GET` | `/api/expenses/{id}` | Get expense by ID |
| `PUT` | `/api/expenses/{id}` | Update expense details |
| `DELETE`| `/api/expenses/{id}` | Delete an expense by ID |
| `DELETE`| `/api/expenses/clear-all` | Clear all expense records |
| `GET` | `/api/expenses/summary` | Get category breakdown & total spending |
| `GET` | `/api/budget/current` | Get current monthly budget |
| `POST` | `/api/budget` | Set/update monthly budget |
| `GET` | `/api/auth/me` | Get the current server-session account |
| `POST` | `/api/auth/logout` | End the server session |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/savings-goals` | Manage account-owned savings goals |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/category-budgets` | Manage account-owned monthly category limits |
| `GET`, `POST` | `/api/notifications` | List alerts and persist unusual-spending alerts |
| `PUT` | `/api/notifications/{id}/read` | Mark an alert as read |
| `GET`, `POST`, `DELETE` | `/api/shared-expenses` | Manage account-owned equal expense splits |

Expense, budget, savings-goal, category-budget, shared-expense, and notification API operations require a signed-in server session. Legacy database expenses without an owner remain unassigned and are not exposed to accounts.
