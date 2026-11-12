package com.expense.tracker.controller;

import com.expense.tracker.model.SharedExpense;
import com.expense.tracker.model.User;
import com.expense.tracker.repository.SharedExpenseRepository;
import com.expense.tracker.repository.UserRepository;
import com.expense.tracker.service.CurrentUserService;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SharedExpenseControllerTest {
    @Test
    void dividesAmountIntoEqualSharesAndDistributesRemainderCents() {
        SharedExpenseRepository repository = mock(SharedExpenseRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        HttpSession session = mock(HttpSession.class);
        User user = new User("Test", "test@example.com", "password");
        user.setId(8L);
        when(session.getAttribute(CurrentUserService.SESSION_USER_ID)).thenReturn(8L);
        when(userRepository.findById(8L)).thenReturn(java.util.Optional.of(user));
        when(repository.save(any(SharedExpense.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SharedExpenseController controller = new SharedExpenseController(
                repository, new CurrentUserService(userRepository));
        var request = new SharedExpenseController.SharedExpenseRequest(
                "Dinner", new BigDecimal("10.00"), "USD", LocalDate.of(2026, 1, 1),
                List.of(new SharedExpenseController.ParticipantInput("Alex"),
                        new SharedExpenseController.ParticipantInput("Blair"),
                        new SharedExpenseController.ParticipantInput("Casey")));

        SharedExpense saved = controller.create(request, session).getBody();
        assertNotNull(saved);
        assertEquals(List.of(new BigDecimal("3.34"), new BigDecimal("3.33"), new BigDecimal("3.33")),
                saved.getParticipants().stream().map(p -> p.getShareAmount()).toList());
        assertEquals(new BigDecimal("10.00"), saved.getParticipants().stream()
                .map(p -> p.getShareAmount()).reduce(BigDecimal.ZERO, BigDecimal::add));
        assertSame(user, saved.getOwner());
    }
}
