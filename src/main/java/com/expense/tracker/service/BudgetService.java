package com.expense.tracker.service;

import com.expense.tracker.model.Budget;
import com.expense.tracker.model.User;
import com.expense.tracker.repository.BudgetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;

@Service
public class BudgetService {
    private final BudgetRepository budgetRepository;

    public BudgetService(BudgetRepository budgetRepository) {
        this.budgetRepository = budgetRepository;
    }

    @Transactional(readOnly = true)
    public Budget getCurrentBudget(User user) {
        String monthYear = YearMonth.now().toString();
        return budgetRepository.findByOwner_IdAndMonthYear(user.getId(), monthYear)
                .orElseGet(() -> new Budget(25000.0, "₹", monthYear));
    }

    public Budget setBudget(User user, Double amount, String currency) {
        String monthYear = YearMonth.now().toString();
        Budget budget = budgetRepository.findByOwner_IdAndMonthYear(user.getId(), monthYear)
                .orElseGet(() -> new Budget());
        budget.setOwner(user);
        budget.setAmount(amount);
        budget.setCurrency(currency == null || currency.isBlank() ? "₹" : currency.trim());
        budget.setMonthYear(monthYear);
        return budgetRepository.save(budget);
    }
}
