package com.expense.tracker.service;

import com.expense.tracker.model.AppNotification;
import com.expense.tracker.model.Budget;
import com.expense.tracker.model.CategoryBudget;
import com.expense.tracker.model.Expense;
import com.expense.tracker.model.User;
import com.expense.tracker.repository.BudgetRepository;
import com.expense.tracker.repository.CategoryBudgetRepository;
import com.expense.tracker.repository.ExpenseRepository;
import com.expense.tracker.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

@Service
public class BudgetNotificationService {
    private final ExpenseRepository expenseRepository;
    private final BudgetRepository budgetRepository;
    private final CategoryBudgetRepository categoryBudgetRepository;
    private final NotificationRepository notificationRepository;

    public BudgetNotificationService(
            ExpenseRepository expenseRepository,
            BudgetRepository budgetRepository,
            CategoryBudgetRepository categoryBudgetRepository,
            NotificationRepository notificationRepository) {
        this.expenseRepository = expenseRepository;
        this.budgetRepository = budgetRepository;
        this.categoryBudgetRepository = categoryBudgetRepository;
        this.notificationRepository = notificationRepository;
    }

    public void checkBudgetCrossings(User user, Expense expense) {
        YearMonth month = YearMonth.from(expense.getDate());
        int year = month.getYear();
        int monthNumber = month.getMonthValue();
        BigDecimal amount = BigDecimal.valueOf(expense.getAmount());
        BigDecimal monthlyTotal = BigDecimal.valueOf(
                expenseRepository.calculateMonthlySpending(user.getId(), year, monthNumber));
        BigDecimal monthlyBefore = monthlyTotal.subtract(amount).max(BigDecimal.ZERO);

        Budget budget = budgetRepository.findByOwner_IdAndMonthYear(user.getId(), month.toString())
                .orElse(new Budget(25000.0, "₹", month.toString()));
        checkThreshold(user, "MONTHLY_BUDGET", "Monthly spending", monthlyBefore,
                monthlyTotal, BigDecimal.valueOf(budget.getAmount()));

        List<CategoryBudget> categoryBudgets =
                categoryBudgetRepository.findAllByOwner_IdAndMonthYear(user.getId(), month.toString());
        for (CategoryBudget categoryBudget : categoryBudgets) {
            if (!categoryBudget.getCategory().equalsIgnoreCase(expense.getCategory())) continue;
            BigDecimal categoryTotal = BigDecimal.valueOf(expenseRepository.calculateMonthlyCategorySpending(
                    user.getId(), expense.getCategory(), year, monthNumber));
            BigDecimal categoryBefore = categoryTotal.subtract(amount).max(BigDecimal.ZERO);
            checkThreshold(user, "CATEGORY_BUDGET", expense.getCategory() + " spending",
                    categoryBefore, categoryTotal, categoryBudget.getAmount());
        }
    }

    private void checkThreshold(User user, String type, String label, BigDecimal before,
                               BigDecimal after, BigDecimal limit) {
        if (limit == null || limit.signum() <= 0) return;
        BigDecimal warning = limit.multiply(new BigDecimal("0.70"));
        if (before.compareTo(warning) < 0 && after.compareTo(warning) >= 0) {
            save(user, type, label + " has reached 70% of its budget.");
        }
        if (before.compareTo(limit) < 0 && after.compareTo(limit) >= 0) {
            save(user, type, label + " has reached or exceeded its budget.");
        }
    }

    private void save(User user, String type, String message) {
        AppNotification notification = new AppNotification();
        notification.setOwner(user);
        notification.setType(type);
        notification.setMessage(message);
        notification.setRead(false);
        notificationRepository.save(notification);
    }
}
