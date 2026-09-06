package com.magictouch.console.purchasing.data;

import com.magictouch.console.common.entity.BaseEntity;
import com.magictouch.console.directory.data.Supplier;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "purchase_orders")
public class PurchaseOrder extends BaseEntity {

    @Column(name = "corporate_profile_id", nullable = false)
    public Long corporateProfileId;

    // Composite FK in the DB forces this supplier to be Local to the same profile.
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    public Supplier supplier;

    @Column(name = "po_date", nullable = false)
    public LocalDate poDate;

    @Column(name = "prepared_by", length = 120)
    public String preparedBy;

    @Column(name = "prepared_date")
    public LocalDate preparedDate;

    @Column(name = "approved_by", length = 120)
    public String approvedBy;

    @Column(name = "approved_date")
    public LocalDate approvedDate;

    @Column(name = "archived_at")
    public OffsetDateTime archivedAt;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("lineNo")
    public List<PurchaseOrderItem> items = new ArrayList<>();

    public String number() {
        return "PO-" + id;
    }

    public boolean isArchived() {
        return archivedAt != null;
    }

    public int nextLineNo() {
        return items.stream().mapToInt(i -> i.lineNo).max().orElse(0) + 1;
    }
}
