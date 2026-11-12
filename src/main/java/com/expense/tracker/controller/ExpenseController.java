package com.expense.tracker.controller;

import com.expense.tracker.model.Expense;
import com.expense.tracker.model.User;
import com.expense.tracker.service.CurrentUserService;
import com.expense.tracker.service.ExpenseService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {
    private final ExpenseService expenseService;
    private final CurrentUserService currentUserService;

    public ExpenseController(ExpenseService expenseService, CurrentUserService currentUserService) {
        this.expenseService = expenseService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<Expense> getAllExpenses(HttpSession session) {
        return expenseService.getAllExpenses(currentUserService.requireUser(session));
    }

    @GetMapping("/{id}")
    public Expense getExpense(@PathVariable Long id, HttpSession session) {
        return expenseService.getExpense(currentUserService.requireUser(session), id);
    }

    @PostMapping
    public ResponseEntity<Expense> createExpense(@Valid @RequestBody Expense expense, HttpSession session) {
        return ResponseEntity.ok(expenseService.createExpense(currentUserService.requireUser(session), expense));
    }

    @PutMapping("/{id}")
    public Expense updateExpense(@PathVariable Long id, @Valid @RequestBody Expense expense, HttpSession session) {
        return expenseService.updateExpense(currentUserService.requireUser(session), id, expense);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id, HttpSession session) {
        expenseService.deleteExpense(currentUserService.requireUser(session), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public List<Expense> search(@RequestParam String query, HttpSession session) {
        return expenseService.search(currentUserService.requireUser(session), query);
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<Void> clearAll(HttpSession session) {
        expenseService.clearExpenses(currentUserService.requireUser(session));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public List<Map<String, Object>> summary(HttpSession session) {
        return expenseService.categorySummary(currentUserService.requireUser(session));
    }
}
