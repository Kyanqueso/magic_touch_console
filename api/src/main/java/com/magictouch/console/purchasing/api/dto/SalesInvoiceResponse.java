package com.magictouch.console.purchasing.api.dto;

import com.magictouch.console.purchasing.data.PurchaseOrderItem;
import com.magictouch.console.purchasing.data.SalesInvoice;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record SalesInvoiceResponse(
        Long id,
        String number,
        Long corporateProfileId,
        Long purchaseOrderId,
        String purchaseOrderNumber,
        Long supplierId,
        String supplierName,
        LocalDate sinvDate,
        Long debitAccountId,
        Long creditAccountId,
        List<PurchaseOrderItemResponse> items,
        BigDecimal total,
        boolean archived,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static SalesInvoiceResponse from(SalesInvoice s) {
        var po = s.purchaseOrder;
        BigDecimal total = po.items.stream()
                .map(PurchaseOrderItem::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        return new SalesInvoiceResponse(
                s.id, s.number(), s.corporateProfileId,
                po.id, po.number(), po.supplier.id, po.supplier.name,
                s.sinvDate, s.debitAccountId, s.creditAccountId,
                po.items.stream().map(PurchaseOrderItemResponse::from).toList(), total,
                s.isArchived(), s.createdAt, s.updatedAt);
    }
}
