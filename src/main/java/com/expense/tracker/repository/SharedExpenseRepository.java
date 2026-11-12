package com.expense.tracker.repository;

import com.expense.tracker.model.SharedExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SharedExpenseRepository extends JpaRepository<SharedExpense, Long> {
    List<SharedExpense> findAllByOwner_IdOrderByDateDesc(Long ownerId);
    Optional<SharedExpense> findByIdAndOwner_Id(Long id, Long ownerId);
}
