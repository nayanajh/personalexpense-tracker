package com.expense.tracker.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    // When users visit http://localhost:8080/ or root, redirect them directly to welcome.html
    @GetMapping("/")
    public String root() {
        return "redirect:/welcome.html";
    }
}

