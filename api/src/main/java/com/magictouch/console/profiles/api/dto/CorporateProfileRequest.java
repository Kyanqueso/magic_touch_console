package com.magictouch.console.profiles.api.dto;

import com.magictouch.console.common.constraint.Patterns;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Create / update body for a corporate profile. Only {@code name} is required, so
 * the same shape serves both the "add" (name only) and the full detail form.
 * {@code registrations} / {@code filingTypes} are replaced wholesale when present,
 * left untouched when {@code null}.
 */
public record CorporateProfileRequest(
        @NotBlank @Size(max = 200) String name,
        @Size(max = 4000) String address,
        @Pattern(regexp = Patterns.TIN, message = "Must look like 000-000-000-00000.") String tin,
        @Pattern(regexp = Patterns.SSS, message = "Must look like 00-0000000-0.") String sss,
        @Pattern(regexp = Patterns.PHIC, message = "Must look like 00-000000000-0.") String phic,
        @Pattern(regexp = Patterns.HDMF, message = "Must look like 0000-0000-0000.") String hdmf,
        @Size(max = 10) String wtaxAtc1,
        @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2) BigDecimal wtaxAtc1Rate,
        @Size(max = 10) String wtaxAtc2,
        @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2) BigDecimal wtaxAtc2Rate,
        @Valid List<RegistrationInput> registrations,
        List<String> filingTypes
) {
}
