package com.magictouch.console.purchasing.api.dto;

import com.magictouch.console.purchasing.data.LineSummary;
import com.magictouch.console.purchasing.data.PurchaseOrder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record PurchaseOrderSummaryRow(
        Long id,
        String number,
        Long supplierId,
        String supplierName,
        LocalDate poDate,
        int itemCount,
        BigDecimal total,
        boolean archived,
        OffsetDateTime createdAt
) {

    public static PurchaseOrderSummaryRow from(PurchaseOrder po, LineSummary lines) {
        return new PurchaseOrderSummaryRow(
                po.id, po.number(), po.supplier.id, po.supplier.name, po.poDate,
                lines.count(), lines.total(), po.isArchived(), po.createdAt);
    }
}
