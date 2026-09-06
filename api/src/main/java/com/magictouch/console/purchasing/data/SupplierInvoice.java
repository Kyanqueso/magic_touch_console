package com.magictouch.console.purchasing.data;

import com.magictouch.console.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "supplier_invoices")
public class SupplierInvoice extends BaseEntity {

    @Column(name = "corporate_profile_id", nullable = false)
    public Long corporateProfileId;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    public PurchaseOrder purchaseOrder;

    @Column(name = "sinv_date", nullable = false)
    public LocalDate sinvDate;

    // chart_of_accounts FKs — kept simple (plain ids) while the ledger model is TBD.
    @Column(name = "debit_account_id")
    public Long debitAccountId;

    @Column(name = "credit_account_id")
    public Long creditAccountId;

    @Column(name = "archived_at")
    public OffsetDateTime archivedAt;

    public String number() {
        return "S-INV-" + id;
    }

    public boolean isArchived() {
        return archivedAt != null;
    }
}
