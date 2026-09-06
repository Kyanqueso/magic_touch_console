package com.magictouch.console.purchasing.api.dto;

import com.magictouch.console.purchasing.data.PurchaseOrderItem;

import java.math.BigDecimal;
import java.math.RoundingMode;

public record PurchaseOrderItemResponse(
        Long id,
        int lineNo,
        Long materialId,
        String materialCode,
        String materialName,
        BigDecimal qty,
        String unit,
        BigDecimal unitPrice,
        BigDecimal amount
) {

    public static PurchaseOrderItemResponse from(PurchaseOrderItem i) {
        return new PurchaseOrderItemResponse(
                i.id, i.lineNo, i.material.id, i.material.code, i.material.name,
                i.qty, i.unit, i.unitPrice,
                i.amount().setScale(2, RoundingMode.HALF_UP));
    }
}
