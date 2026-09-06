package com.magictouch.console.purchasing.api.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record PurchaseOrderItemRequest(
        @NotNull Long materialId,
        @NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal qty,
        @Size(max = 20) String unit,
        /** Optional — defaults to the material's current unit price. */
        @PositiveOrZero @Digits(integer = 8, fraction = 4) BigDecimal unitPrice
) {
}
