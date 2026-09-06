package com.magictouch.console.purchasing.api.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record VoucherRequest(
        @NotNull Long supplierInvoiceId,
        @NotNull LocalDate voucherDate,
        @NotNull @PositiveOrZero @Digits(integer = 12, fraction = 2) BigDecimal netAmount,
        boolean paid,
        Long debitAccountId,
        Long creditCashAccountId,
        Long creditPayableAccountId
) {
}
