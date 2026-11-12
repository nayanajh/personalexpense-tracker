package com.expense.tracker.controller;

import com.expense.tracker.model.CategoryBudget;
import com.expense.tracker.model.User;
import com.expense.tracker.repository.CategoryBudgetRepository;
import com.expense.tracker.service.CurrentUserService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/api/category-budgets")
public class CategoryBudgetController {
    private final CategoryBudgetRepository repository;
    private final CurrentUserService currentUserService;

    public CategoryBudgetController(CategoryBudgetRepository repository, CurrentUserService currentUserService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<CategoryBudget> list(HttpSession session) {
        User user = currentUserService.requireUser(session);
        return repository.findAllByOwner_IdOrderByMonthYearDescCategoryAsc(user.getId());
    }

    @PostMapping
    public ResponseEntity<CategoryBudget> create(@Valid @RequestBody CategoryBudget budget, HttpSession session) {
        User user = currentUserService.requireUser(session);
        budget.setId(null);
        budget.setOwner(user);
        normalize(budget);
        if (repository.findByOwner_IdAndMonthYearAndCategoryIgnoreCase(
                user.getId(), budget.getMonthYear(), budget.getCategory()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A budget already exists for this category and month.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(budget));
    }

    @PutMapping("/{id}")
    public CategoryBudget update(@PathVariable Long id, @Valid @RequestBody CategoryBudget changes, HttpSession session) {
        User user = currentUserService.requireUser(session);
        CategoryBudget budget = repository.findByIdAndOwner_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        changes.setOwner(user);
        normalize(changes);
        repository.findByOwner_IdAndMonthYearAndCategoryIgnoreCase(
                        user.getId(), changes.getMonthYear(), changes.getCategory())
                .filter(duplicate -> !duplicate.getId().equals(id))
                .ifPresent(duplicate -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "A budget already exists for this category and month.");
                });
        budget.setCategory(changes.getCategory());
        budget.setAmount(changes.getAmount());
        budget.setCurrency(changes.getCurrency());
        budget.setMonthYear(changes.getMonthYear());
        return repository.save(budget);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpSession session) {
        User user = currentUserService.requireUser(session);
        CategoryBudget budget = repository.findByIdAndOwner_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        repository.delete(budget);
        return ResponseEntity.noContent().build();
    }

    private void normalize(CategoryBudget budget) {
        budget.setCategory(budget.getCategory().trim());
        budget.setCurrency(budget.getCurrency() == null || budget.getCurrency().isBlank()
                ? "₹" : budget.getCurrency().trim());
        String month = budget.getMonthYear();
        try {
            budget.setMonthYear((month == null || month.isBlank() ? YearMonth.now() : YearMonth.parse(month)).toString());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "monthYear must use YYYY-MM format.");
        }
    }
}
