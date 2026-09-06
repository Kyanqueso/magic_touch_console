package com.magictouch.console.directory.api.dto;

import com.magictouch.console.common.constraint.Patterns;
import com.magictouch.console.common.model.Scope;
import com.magictouch.console.directory.data.CompanyType;
import com.magictouch.console.directory.data.TaxType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Create / update body for a customer or supplier. Same shape for both. */
public record PartyRequest(
        @NotNull Scope scope,
        @NotBlank @Size(max = 200) String name,
        @Size(max = 4000) String address,
        @Size(max = 20) String zipCode,
        @PositiveOrZero @Max(365) Integer termsDays,
        @Pattern(regexp = Patterns.TIN, message = "Must look like 000-000-000-000.") String tin,
        @Size(max = 10) String branchCode,
        CompanyType companyType,
        TaxType taxType,
        @Size(max = 10) String wtaxAtc1,
        @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2) BigDecimal wtaxAtc1Rate,
        @Size(max = 10) String wtaxAtc2,
        @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2) BigDecimal wtaxAtc2Rate
) {
}
