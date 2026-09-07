package com.magictouch.console.purchasing.api.dto;

import com.magictouch.console.purchasing.data.LineSummary;
import com.magictouch.console.purchasing.data.SalesInvoice;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record SalesInvoiceSummaryRow(
        Long id,
        String number,
        Long purchaseOrderId,
        String purchaseOrderNumber,
        LocalDate sinvDate,
        int itemCount,
        BigDecimal total,
        boolean archived,
        OffsetDateTime createdAt
) {

    public static SalesInvoiceSummaryRow from(SalesInvoice s, LineSummary lines) {
        var po = s.purchaseOrder;
        return new SalesInvoiceSummaryRow(
                s.id, s.number(), po.id, po.number(), s.sinvDate,
                lines.count(), lines.total(), s.isArchived(), s.createdAt);
    }
}
