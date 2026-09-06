package com.magictouch.console.joborders.api.dto;

import com.magictouch.console.common.constraint.WordCount;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record JobOrderRequest(
        @NotNull Long customerId,
        @Size(max = 80) String branch,
        @Size(max = 20) String seriesFrom,
        @Size(max = 20) String seriesTo,
        @Size(max = 160) String jobDescription,
        @Size(max = 160) String specification,
        @Size(max = 60) String equipment,
        LocalDate dateOrdered,
        LocalDate deliveryDate,
        @Size(max = 40) String customerPoRef,
        @Size(max = 40) String atpNo,
        LocalDate atpDate,
        @Size(max = 40) String invoiceNo,
        LocalDate invoiceDate,
        @Size(max = 40) String orNo,
        LocalDate orDate,
        @PositiveOrZero Integer qty,
        @Size(max = 20) String unit,
        @Size(max = 40) String size,
        @PositiveOrZero @Digits(integer = 8, fraction = 4) BigDecimal unitPrice,
        @Size(max = 120) String operator,
        @Size(max = 120) String collator,
        @WordCount(max = 200) String otherInstructions
) {
}
