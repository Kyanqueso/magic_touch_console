package com.magictouch.console.purchasing.api.dto;

import com.magictouch.console.purchasing.data.PurchaseOrder;
import com.magictouch.console.purchasing.data.PurchaseOrderItem;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record PurchaseOrderResponse(
        Long id,
        String number,
        Long corporateProfileId,
        Long supplierId,
        String supplierName,
        LocalDate poDate,
        String preparedBy,
        LocalDate preparedDate,
        String approvedBy,
        LocalDate approvedDate,
        List<PurchaseOrderItemResponse> items,
        int itemCount,
        BigDecimal total,
        boolean archived,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static PurchaseOrderResponse from(PurchaseOrder po) {
        BigDecimal total = po.items.stream()
                .map(PurchaseOrderItem::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        return new PurchaseOrderResponse(
                po.id, po.number(), po.corporateProfileId, po.supplier.id, po.supplier.name,
                po.poDate, po.preparedBy, po.preparedDate, po.approvedBy, po.approvedDate,
                po.items.stream().map(PurchaseOrderItemResponse::from).toList(),
                po.items.size(), total,
                po.isArchived(), po.createdAt, po.updatedAt);
    }
}
