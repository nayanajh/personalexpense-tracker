package com.expense.tracker.service;

import com.expense.tracker.model.Expense;
import com.expense.tracker.model.User;
import com.expense.tracker.repository.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

@Service
public class ExpenseService {
    private final ExpenseRepository expenseRepository;
    private final BudgetNotificationService budgetNotificationService;

    public ExpenseService(ExpenseRepository expenseRepository, BudgetNotificationService budgetNotificationService) {
        this.expenseRepository = expenseRepository;
        this.budgetNotificationService = budgetNotificationService;
    }

    public List<Expense> getAllExpenses(User user) {
        return expenseRepository.findAllByOwner_IdOrderByDateDesc(user.getId());
    }

    public Expense getExpense(User user, Long id) {
        return expenseRepository.findByIdAndOwner_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    public Expense createExpense(User user, Expense expense) {
        expense.setId(null);
        expense.setOwner(user);
        Expense saved = expenseRepository.save(expense);
        budgetNotificationService.checkBudgetCrossings(user, saved);
        return saved;
    }

    @Transactional
    public Expense updateExpense(User user, Long id, Expense changes) {
        Expense existing = getExpense(user, id);
        existing.setTitle(changes.getTitle());
        existing.setAmount(changes.getAmount());
        existing.setCategory(changes.getCategory());
        existing.setDate(changes.getDate());
        existing.setPaymentMethod(changes.getPaymentMethod());
        return expenseRepository.save(existing);
    }

    public void deleteExpense(User user, Long id) {
        expenseRepository.delete(getExpense(user, id));
    }

    public void clearExpenses(User user) {
        expenseRepository.deleteAll(expenseRepository.findAllByOwner_IdOrderByDateDesc(user.getId()));
    }

    public List<Expense> search(User user, String query) {
        return expenseRepository.findByOwner_IdAndTitleContainingIgnoreCaseOrderByDateDesc(user.getId(), query);
    }

    public Double totalSpending(User user) {
        return expenseRepository.calculateTotalSpending(user.getId());
    }

    public List<Map<String, Object>> categorySummary(User user) {
        return expenseRepository.getCategorySpendingSummary(user.getId());
    }
}
