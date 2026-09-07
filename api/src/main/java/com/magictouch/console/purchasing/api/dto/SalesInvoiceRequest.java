package com.magictouch.console.purchasing.api.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record SalesInvoiceRequest(
        @NotNull Long purchaseOrderId,
        @NotNull LocalDate sinvDate,
        Long debitAccountId,
        Long creditAccountId
) {
}
