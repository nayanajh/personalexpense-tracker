package com.expense.tracker.service;

import com.expense.tracker.model.User;
import com.expense.tracker.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void authenticatingLegacyPlainPasswordUpgradesItToBcrypt() {
        User user = new User("Test User", "person@example.com", "plain-secret");
        user.setId(42L);
        when(userRepository.findByEmail("person@example.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertTrue(userService.authenticateUser("person@example.com", "plain-secret").isPresent());
        assertNotEquals("plain-secret", user.getPassword());
        assertTrue(new BCryptPasswordEncoder().matches("plain-secret", user.getPassword()));
        verify(userRepository).save(user);
    }

    @Test
    void rejectsIncorrectLegacyPasswordWithoutChangingIt() {
        User user = new User("Test User", "person@example.com", "plain-secret");
        when(userRepository.findByEmail("person@example.com")).thenReturn(Optional.of(user));

        assertTrue(userService.authenticateUser("person@example.com", "wrong").isEmpty());
        assertEquals("plain-secret", user.getPassword());
        verify(userRepository, never()).save(any(User.class));
    }
}
