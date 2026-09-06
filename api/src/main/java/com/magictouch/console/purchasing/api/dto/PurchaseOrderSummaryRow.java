package com.magictouch.console.purchasing.api.dto;

import com.magictouch.console.purchasing.data.PurchaseOrder;
import com.magictouch.console.purchasing.data.PurchaseOrderItem;

import java.math.BigDecimal;
import java.math.RoundingMode;
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

    public static PurchaseOrderSummaryRow from(PurchaseOrder po) {
        BigDecimal total = po.items.stream()
                .map(PurchaseOrderItem::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        return new PurchaseOrderSummaryRow(
                po.id, po.number(), po.supplier.id, po.supplier.name, po.poDate,
                po.items.size(), total, po.isArchived(), po.createdAt);
    }
}
