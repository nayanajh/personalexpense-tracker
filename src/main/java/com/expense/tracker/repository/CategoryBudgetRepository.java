package com.expense.tracker.repository;

import com.expense.tracker.model.CategoryBudget;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoryBudgetRepository extends JpaRepository<CategoryBudget, Long> {
    List<CategoryBudget> findAllByOwner_IdOrderByMonthYearDescCategoryAsc(Long ownerId);
    Optional<CategoryBudget> findByIdAndOwner_Id(Long id, Long ownerId);
    List<CategoryBudget> findAllByOwner_IdAndMonthYear(Long ownerId, String monthYear);
    Optional<CategoryBudget> findByOwner_IdAndMonthYearAndCategoryIgnoreCase(Long ownerId, String monthYear, String category);
}
