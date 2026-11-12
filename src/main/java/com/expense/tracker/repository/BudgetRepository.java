package com.expense.tracker.repository;

import com.expense.tracker.model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {

    // Retrieve active budget by monthYear key
    Optional<Budget> findByOwner_IdAndMonthYear(Long ownerId, String monthYear);
}
