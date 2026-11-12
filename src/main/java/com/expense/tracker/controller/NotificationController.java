package com.expense.tracker.controller;

import com.expense.tracker.model.AppNotification;
import com.expense.tracker.model.User;
import com.expense.tracker.repository.NotificationRepository;
import com.expense.tracker.service.CurrentUserService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationRepository repository;
    private final CurrentUserService currentUserService;

    public NotificationController(NotificationRepository repository, CurrentUserService currentUserService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<AppNotification> list(HttpSession session) {
        User user = currentUserService.requireUser(session);
        return repository.findAllByOwner_IdOrderByCreatedAtDesc(user.getId());
    }

    @PostMapping
    public ResponseEntity<AppNotification> createUnusualSpending(
            @Valid @RequestBody NotificationRequest request, HttpSession session) {
        User user = currentUserService.requireUser(session);
        if (!"UNUSUAL_SPENDING".equals(request.type())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported notification type.");
        }
        var existing = repository.findFirstByOwner_IdAndTypeAndMessageOrderByCreatedAtDesc(
                user.getId(), request.type(), request.message());
        if (existing.isPresent()) {
            return ResponseEntity.ok(existing.get());
        }
        AppNotification notification = new AppNotification();
        notification.setOwner(user);
        notification.setType(request.type());
        notification.setMessage(request.message());
        notification.setRead(false);
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(notification));
    }

    @PutMapping("/{id}/read")
    public AppNotification markRead(@PathVariable Long id, HttpSession session) {
        User user = currentUserService.requireUser(session);
        AppNotification notification = repository.findByIdAndOwner_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        notification.setRead(true);
        return repository.save(notification);
    }

    public record NotificationRequest(
            @NotBlank @Size(max = 40) String type,
            @NotBlank @Size(max = 500) String message) {
    }
}
