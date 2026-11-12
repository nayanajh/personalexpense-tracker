package com.expense.tracker.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class UserJsonTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void acceptsPasswordInputButNeverSerializesIt() throws Exception {
        User user = objectMapper.readValue(
                "{\"fullName\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"secret\"}",
                User.class);
        assertEquals("secret", user.getPassword());
        assertFalse(objectMapper.writeValueAsString(user).contains("secret"));
        assertFalse(objectMapper.writeValueAsString(user).contains("\"password\""));
    }
}
