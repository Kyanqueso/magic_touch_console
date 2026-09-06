package com.magictouch.console.purchasing.api.dto;

import com.magictouch.console.purchasing.data.Voucher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record VoucherSummaryRow(
        Long id,
        String number,
        Long supplierInvoiceId,
        String supplierInvoiceNumber,
        LocalDate voucherDate,
        BigDecimal netAmount,
        boolean paid,
        boolean archived,
        OffsetDateTime createdAt
) {

    public static VoucherSummaryRow from(Voucher v) {
        return new VoucherSummaryRow(
                v.id, v.number(), v.supplierInvoice.id, v.supplierInvoice.number(),
                v.voucherDate, v.netAmount, v.paid, v.isArchived(), v.createdAt);
    }
}
