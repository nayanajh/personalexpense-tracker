package com.expense.tracker.controller;

import com.expense.tracker.model.AppNotification;
import com.expense.tracker.model.User;
import com.expense.tracker.repository.NotificationRepository;
import com.expense.tracker.repository.UserRepository;
import com.expense.tracker.service.CurrentUserService;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationControllerTest {
    @Test
    void createsUnusualSpendingNotificationForCurrentAccount() {
        NotificationRepository repository = mock(NotificationRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        HttpSession session = mock(HttpSession.class);
        User user = new User("Test", "test@example.com", "password");
        user.setId(8L);
        when(session.getAttribute(CurrentUserService.SESSION_USER_ID)).thenReturn(8L);
        when(userRepository.findById(8L)).thenReturn(Optional.of(user));
        when(repository.findFirstByOwner_IdAndTypeAndMessageOrderByCreatedAtDesc(8L, "UNUSUAL_SPENDING", "Alert"))
                .thenReturn(Optional.empty());
        when(repository.save(any(AppNotification.class))).thenAnswer(invocation -> invocation.getArgument(0));
        NotificationController controller = new NotificationController(repository, new CurrentUserService(userRepository));

        var response = controller.createUnusualSpending(
                new NotificationController.NotificationRequest("UNUSUAL_SPENDING", "Alert"), session);

        assertEquals(201, response.getStatusCode().value());
        assertSame(user, response.getBody().getOwner());
        assertEquals("Alert", response.getBody().getMessage());
        assertFalse(response.getBody().isRead());
    }

    @Test
    void reusesAnExistingAccountNotificationInsteadOfDuplicatingIt() {
        NotificationRepository repository = mock(NotificationRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        HttpSession session = mock(HttpSession.class);
        User user = new User("Test", "test@example.com", "password");
        user.setId(8L);
        AppNotification existing = new AppNotification();
        existing.setOwner(user);
        existing.setType("UNUSUAL_SPENDING");
        existing.setMessage("Alert");
        when(session.getAttribute(CurrentUserService.SESSION_USER_ID)).thenReturn(8L);
        when(userRepository.findById(8L)).thenReturn(Optional.of(user));
        when(repository.findFirstByOwner_IdAndTypeAndMessageOrderByCreatedAtDesc(8L, "UNUSUAL_SPENDING", "Alert"))
                .thenReturn(Optional.of(existing));
        NotificationController controller = new NotificationController(repository, new CurrentUserService(userRepository));

        var response = controller.createUnusualSpending(
                new NotificationController.NotificationRequest("UNUSUAL_SPENDING", "Alert"), session);

        assertEquals(200, response.getStatusCode().value());
        assertSame(existing, response.getBody());
        verify(repository, never()).save(any(AppNotification.class));
    }

    @Test
    void rejectsUnsupportedClientNotificationTypes() {
        NotificationRepository repository = mock(NotificationRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        HttpSession session = mock(HttpSession.class);
        User user = new User("Test", "test@example.com", "password");
        user.setId(8L);
        when(session.getAttribute(CurrentUserService.SESSION_USER_ID)).thenReturn(8L);
        when(userRepository.findById(8L)).thenReturn(Optional.of(user));
        NotificationController controller = new NotificationController(repository, new CurrentUserService(userRepository));

        assertThrows(ResponseStatusException.class, () -> controller.createUnusualSpending(
                new NotificationController.NotificationRequest("OTHER", "Alert"), session));
        verify(repository, never()).save(any(AppNotification.class));
    }
}
