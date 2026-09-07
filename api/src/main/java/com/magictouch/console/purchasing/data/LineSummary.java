package com.magictouch.console.purchasing.data;

import java.math.BigDecimal;

// Line-item count and money total for one document, from a grouped query.
public record LineSummary(int count, BigDecimal total) {

    public static final LineSummary EMPTY = new LineSummary(0, BigDecimal.ZERO.setScale(2));

    static LineSummary of(Object count, Object total) {
        BigDecimal t = total == null
                ? BigDecimal.ZERO
                : new BigDecimal(total.toString());
        return new LineSummary(((Number) count).intValue(), t.setScale(2, java.math.RoundingMode.HALF_UP));
    }
}
