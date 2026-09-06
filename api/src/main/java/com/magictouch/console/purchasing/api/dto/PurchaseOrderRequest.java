package com.magictouch.console.purchasing.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record PurchaseOrderRequest(
        @NotNull LocalDate poDate,
        @Size(max = 120) String preparedBy,
        LocalDate preparedDate,
        @Size(max = 120) String approvedBy,
        LocalDate approvedDate
) {
}
