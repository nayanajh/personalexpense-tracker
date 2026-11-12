package com.expense.tracker.controller;

import com.expense.tracker.model.SavingsGoal;
import com.expense.tracker.model.User;
import com.expense.tracker.repository.SavingsGoalRepository;
import com.expense.tracker.service.CurrentUserService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/savings-goals")
public class SavingsGoalController {
    private final SavingsGoalRepository repository;
    private final CurrentUserService currentUserService;

    public SavingsGoalController(SavingsGoalRepository repository, CurrentUserService currentUserService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<SavingsGoal> list(HttpSession session) {
        User user = currentUserService.requireUser(session);
        return repository.findAllByOwner_IdOrderByIdDesc(user.getId());
    }

    @PostMapping
    public ResponseEntity<SavingsGoal> create(@Valid @RequestBody SavingsGoal goal, HttpSession session) {
        goal.setId(null);
        goal.setOwner(currentUserService.requireUser(session));
        if (goal.getCurrentAmount() == null) goal.setCurrentAmount(java.math.BigDecimal.ZERO);
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(goal));
    }

    @PutMapping("/{id}")
    public SavingsGoal update(@PathVariable Long id, @Valid @RequestBody SavingsGoal changes, HttpSession session) {
        User user = currentUserService.requireUser(session);
        SavingsGoal goal = repository.findByIdAndOwner_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        goal.setName(changes.getName());
        goal.setTargetAmount(changes.getTargetAmount());
        goal.setCurrentAmount(changes.getCurrentAmount());
        goal.setDeadline(changes.getDeadline());
        return repository.save(goal);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpSession session) {
        User user = currentUserService.requireUser(session);
        SavingsGoal goal = repository.findByIdAndOwner_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        repository.delete(goal);
        return ResponseEntity.noContent().build();
    }
}
