package com.expense.tracker.repository;

import com.expense.tracker.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // Retrieve all expenses ordered with newest dates first
    List<Expense> findAllByOwner_IdOrderByDateDesc(Long ownerId);

    Optional<Expense> findByIdAndOwner_Id(Long id, Long ownerId);

    List<Expense> findByOwner_IdAndTitleContainingIgnoreCaseOrderByDateDesc(Long ownerId, String title);

    @Query("SELECT COALESCE(SUM(e.amount), 0.0) FROM Expense e WHERE e.owner.id = :ownerId")
    Double calculateTotalSpending(Long ownerId);

    @Query("SELECT e.category AS category, SUM(e.amount) AS totalAmount FROM Expense e " +
            "WHERE e.owner.id = :ownerId GROUP BY e.category ORDER BY totalAmount DESC")
    List<Map<String, Object>> getCategorySpendingSummary(Long ownerId);

    @Query("SELECT COALESCE(SUM(e.amount), 0.0) FROM Expense e WHERE e.owner.id = :ownerId " +
            "AND YEAR(e.date) = :year AND MONTH(e.date) = :month")
    Double calculateMonthlySpending(Long ownerId, int year, int month);

    @Query("SELECT COALESCE(SUM(e.amount), 0.0) FROM Expense e WHERE e.owner.id = :ownerId " +
            "AND LOWER(e.category) = LOWER(:category) AND YEAR(e.date) = :year AND MONTH(e.date) = :month")
    Double calculateMonthlyCategorySpending(Long ownerId, String category, int year, int month);
}
