package com.magictouch.console.purchasing.api.dto;

import com.magictouch.console.purchasing.data.PurchaseOrderItem;
import com.magictouch.console.purchasing.data.SupplierInvoice;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record SupplierInvoiceSummaryRow(
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

    public static SupplierInvoiceSummaryRow from(SupplierInvoice s) {
        var po = s.purchaseOrder;
        BigDecimal total = po.items.stream()
                .map(PurchaseOrderItem::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        return new SupplierInvoiceSummaryRow(
                s.id, s.number(), po.id, po.number(), s.sinvDate,
                po.items.size(), total, s.isArchived(), s.createdAt);
    }
}
