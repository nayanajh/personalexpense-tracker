package com.expense.tracker.repository;

import com.expense.tracker.model.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<AppNotification, Long> {
    List<AppNotification> findAllByOwner_IdOrderByCreatedAtDesc(Long ownerId);
    Optional<AppNotification> findByIdAndOwner_Id(Long id, Long ownerId);
    Optional<AppNotification> findFirstByOwner_IdAndTypeAndMessageOrderByCreatedAtDesc(
            Long ownerId, String type, String message);
}
