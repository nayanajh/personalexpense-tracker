package com.expense.tracker.repository;

import com.expense.tracker.model.SavingsGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    List<SavingsGoal> findAllByOwner_IdOrderByIdDesc(Long ownerId);
    Optional<SavingsGoal> findByIdAndOwner_Id(Long id, Long ownerId);
}
