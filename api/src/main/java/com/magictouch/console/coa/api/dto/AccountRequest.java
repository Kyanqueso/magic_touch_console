package com.magictouch.console.coa.api.dto;

import com.magictouch.console.coa.data.AccountClass;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** {@code category} is free text — an existing category name or a new one. */
public record AccountRequest(
        @NotBlank @Size(max = 120) String category,
        @NotNull AccountClass accountClass,
        @Size(max = 40) String subType,
        @NotBlank @Size(max = 20) String code,
        @NotBlank @Size(max = 200) String name,
        @Size(max = 10) String atcCode,
        @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2) BigDecimal taxRate,
        @Size(max = 60) String referenceForm
) {
}
