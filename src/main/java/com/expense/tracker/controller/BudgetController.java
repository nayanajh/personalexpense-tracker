package com.expense.tracker.controller;

import com.expense.tracker.model.Budget;
import com.expense.tracker.model.User;
import com.expense.tracker.service.CurrentUserService;
import com.expense.tracker.service.BudgetService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/budget")
public class BudgetController {

    private final BudgetService budgetService;
    private final CurrentUserService currentUserService;

    public BudgetController(BudgetService budgetService, CurrentUserService currentUserService) {
        this.budgetService = budgetService;
        this.currentUserService = currentUserService;
    }

    // Get current monthly budget
    @GetMapping("/current")
    public ResponseEntity<Budget> getCurrentBudget(HttpSession session) {
        User user = currentUserService.requireUser(session);
        Budget budget = budgetService.getCurrentBudget(user);
        return ResponseEntity.ok(budget);
    }

    // Set or update monthly budget
    @PostMapping
    public ResponseEntity<Budget> updateBudget(@Valid @RequestBody Budget budgetRequest, HttpSession session) {
        User user = currentUserService.requireUser(session);
        Budget savedBudget = budgetService.setBudget(user,
                budgetRequest.getAmount(),
                budgetRequest.getCurrency()
        );
        return ResponseEntity.ok(savedBudget);
    }
}
