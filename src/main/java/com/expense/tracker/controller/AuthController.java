package com.expense.tracker.controller;

import com.expense.tracker.model.User;
import com.expense.tracker.service.CurrentUserService;
import com.expense.tracker.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final CurrentUserService currentUserService;

    public AuthController(UserService userService, CurrentUserService currentUserService) {
        this.userService = userService;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody User user, HttpServletRequest request) {
        try {
            User created = userService.registerUser(user);
            authenticateSession(request, created);
            return ResponseEntity.status(HttpStatus.CREATED).body(userResponse(created, "User registered successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials, HttpServletRequest request) {
        String identifier = credentials.get("email");
        if (identifier == null || identifier.isBlank()) {
            identifier = credentials.get("username");
        }
        if (identifier == null || identifier.isBlank()) {
            identifier = credentials.get("identifier");
        }
        String password = credentials.get("password");

        if (identifier == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email/Username and password are required."));
        }

        return userService.authenticateUser(identifier.trim(), password)
                .map(u -> {
                    authenticateSession(request, u);
                    return ResponseEntity.ok(userResponse(u, "Login successful"));
                })
                .orElseGet(() -> {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("error", "Invalid email or password."));
                });
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpSession session) {
        return userResponse(currentUserService.requireUser(session), null);
    }

    private void authenticateSession(HttpServletRequest request, User user) {
        HttpSession session = request.getSession(true);
        try {
            request.changeSessionId();
        } catch (IllegalStateException ignored) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unable to establish session.");
        }
        session.setAttribute(CurrentUserService.SESSION_USER_ID, user.getId());
    }

    private Map<String, Object> userResponse(User user, String message) {
        Map<String, Object> response = new HashMap<>();
        if (message != null) response.put("message", message);
        response.put("id", user.getId());
        response.put("fullName", user.getFullName());
        response.put("email", user.getEmail());
        return response;
    }
}
