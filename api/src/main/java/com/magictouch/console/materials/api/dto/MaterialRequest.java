package com.magictouch.console.materials.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** {@code group} is free text — an existing group name or a new one. */
public record MaterialRequest(
        @NotBlank @Size(max = 120) String group,
        @NotBlank @Size(max = 20) String code,
        @NotBlank @Size(max = 160) String name,
        @NotNull @DecimalMin("0.0000") @Digits(integer = 8, fraction = 4) BigDecimal unitPrice
) {
}
