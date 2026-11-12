package com.expense.tracker.controller;

import com.expense.tracker.model.SharedExpense;
import com.expense.tracker.model.SharedExpenseParticipant;
import com.expense.tracker.model.User;
import com.expense.tracker.repository.SharedExpenseRepository;
import com.expense.tracker.service.CurrentUserService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/shared-expenses")
public class SharedExpenseController {
    private final SharedExpenseRepository repository;
    private final CurrentUserService currentUserService;

    public SharedExpenseController(SharedExpenseRepository repository, CurrentUserService currentUserService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<SharedExpense> list(HttpSession session) {
        User user = currentUserService.requireUser(session);
        return repository.findAllByOwner_IdOrderByDateDesc(user.getId());
    }

    @PostMapping
    public ResponseEntity<SharedExpense> create(@Valid @RequestBody SharedExpenseRequest request, HttpSession session) {
        User user = currentUserService.requireUser(session);
        Set<String> names = new HashSet<>();
        for (ParticipantInput participant : request.participants()) {
            if (!names.add(participant.name().trim().toLowerCase(Locale.ROOT))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Participant names must be unique.");
            }
        }

        SharedExpense shared = new SharedExpense();
        shared.setTitle(request.title().trim());
        shared.setTotalAmount(request.totalAmount().setScale(2));
        shared.setCurrency(request.currency() == null || request.currency().isBlank() ? "₹" : request.currency().trim());
        shared.setDate(request.date() == null ? LocalDate.now() : request.date());
        shared.setOwner(user);

        long totalCents = request.totalAmount().movePointRight(2).longValueExact();
        long baseCents = totalCents / request.participants().size();
        long remainder = totalCents % request.participants().size();
        List<SharedExpenseParticipant> participants = new ArrayList<>();
        for (int index = 0; index < request.participants().size(); index++) {
            ParticipantInput input = request.participants().get(index);
            SharedExpenseParticipant participant = new SharedExpenseParticipant();
            participant.setName(input.name().trim());
            participant.setShareAmount(BigDecimal.valueOf(baseCents + (index < remainder ? 1 : 0), 2)
                    .setScale(2, RoundingMode.UNNECESSARY));
            participant.setSharedExpense(shared);
            participants.add(participant);
        }
        shared.setParticipants(participants);
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(shared));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpSession session) {
        User user = currentUserService.requireUser(session);
        SharedExpense shared = repository.findByIdAndOwner_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        repository.delete(shared);
        return ResponseEntity.noContent().build();
    }

    public record SharedExpenseRequest(
            @NotBlank @Size(max = 255) String title,
            @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal totalAmount,
            @Size(max = 10) String currency,
            LocalDate date,
            @NotEmpty @Size(max = 50) List<@Valid ParticipantInput> participants) {
    }

    public record ParticipantInput(@NotBlank @Size(max = 120) String name) {
    }
}
