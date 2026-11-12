package com.expense.tracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ExpenseTrackerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExpenseTrackerApplication.class, args);
        System.out.println("=================================================");
        System.out.println(" SpendFlow Application Started Successfully!    ");
        System.out.println(" Access Web App at: http://localhost:8080        ");
        System.out.println(" API Base URL:      http://localhost:8080/api    ");
        System.out.println(" Connected Database: MySQL (expense_tracker_db)  ");
        System.out.println("=================================================");
    }
}
