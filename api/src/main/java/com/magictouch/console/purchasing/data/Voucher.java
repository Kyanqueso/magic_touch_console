package com.magictouch.console.purchasing.data;

import com.magictouch.console.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "vouchers")
public class Voucher extends BaseEntity {

    @Column(name = "corporate_profile_id", nullable = false)
    public Long corporateProfileId;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "supplier_invoice_id", nullable = false)
    public SupplierInvoice supplierInvoice;

    @Column(name = "voucher_date", nullable = false)
    public LocalDate voucherDate;

    @Column(name = "net_amount", nullable = false, precision = 14, scale = 2)
    public BigDecimal netAmount;

    @Column(name = "is_paid", nullable = false)
    public boolean paid;

    @Column(name = "paid_at")
    public OffsetDateTime paidAt;

    @Column(name = "debit_account_id")
    public Long debitAccountId;

    @Column(name = "credit_cash_account_id")
    public Long creditCashAccountId;

    @Column(name = "credit_payable_account_id")
    public Long creditPayableAccountId;

    @Column(name = "archived_at")
    public OffsetDateTime archivedAt;

    public String number() {
        return "VOUC-" + id;
    }

    public boolean isArchived() {
        return archivedAt != null;
    }
}
