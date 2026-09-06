package com.magictouch.console.purchasing.api.dto;

import com.magictouch.console.purchasing.data.Voucher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record VoucherResponse(
        Long id,
        String number,
        Long corporateProfileId,
        Long supplierInvoiceId,
        String supplierInvoiceNumber,
        Long purchaseOrderId,
        Long supplierId,
        String supplierName,
        LocalDate voucherDate,
        BigDecimal netAmount,
        boolean paid,
        OffsetDateTime paidAt,
        Long debitAccountId,
        Long creditCashAccountId,
        Long creditPayableAccountId,
        boolean archived,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static VoucherResponse from(Voucher v) {
        var po = v.supplierInvoice.purchaseOrder;
        return new VoucherResponse(
                v.id, v.number(), v.corporateProfileId,
                v.supplierInvoice.id, v.supplierInvoice.number(),
                po.id, po.supplier.id, po.supplier.name,
                v.voucherDate, v.netAmount, v.paid, v.paidAt,
                v.debitAccountId, v.creditCashAccountId, v.creditPayableAccountId,
                v.isArchived(), v.createdAt, v.updatedAt);
    }
}
