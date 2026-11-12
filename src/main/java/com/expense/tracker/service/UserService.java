package com.expense.tracker.service;

import com.expense.tracker.model.User;
import com.expense.tracker.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User registerUser(User user) {
        user.setId(null);
        user.setEmail(user.getEmail().trim().toLowerCase(java.util.Locale.ROOT));
        user.setFullName(user.getFullName().trim());
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        if (user.getFullName() != null && userRepository.existsByFullName(user.getFullName())) {
            throw new IllegalArgumentException("This username is already taken. Please choose another.");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    @Transactional
    public Optional<User> authenticateUser(String identifier, String password) {
        if (identifier == null) return Optional.empty();
        String trimmed = identifier.trim();
        return userRepository.findByEmail(trimmed.toLowerCase(java.util.Locale.ROOT))
                .or(() -> userRepository.findByFullName(trimmed))
                .filter(user -> verifyAndUpgradePassword(user, password));
    }

    private boolean verifyAndUpgradePassword(User user, String rawPassword) {
        String stored = user.getPassword();
        boolean encoded = stored != null && (stored.startsWith("$2a$")
                || stored.startsWith("$2b$") || stored.startsWith("$2y$"));
        boolean matches;
        try {
            matches = encoded
                    ? passwordEncoder.matches(rawPassword, stored)
                    : stored != null && stored.equals(rawPassword);
        } catch (IllegalArgumentException e) {
            return false;
        }
        if (matches && !encoded) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }
        return matches;
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }
}
