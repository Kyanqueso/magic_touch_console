package com.magictouch.console.joborders.data;

import com.magictouch.console.common.entity.BaseEntity;
import com.magictouch.console.directory.data.Customer;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "job_orders")
public class JobOrder extends BaseEntity {

    @Column(name = "corporate_profile_id", nullable = false)
    public Long corporateProfileId;

    // Cross-module FK target (directory). Read-only reference for display + validation.
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    public Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    public JobOrderStatus status = JobOrderStatus.OPEN;

    @Column(length = 80)
    public String branch;

    @Column(name = "series_from", length = 20)
    public String seriesFrom;

    @Column(name = "series_to", length = 20)
    public String seriesTo;

    @Column(name = "job_description", length = 160)
    public String jobDescription;

    @Column(length = 160)
    public String specification;

    @Column(length = 60)
    public String equipment;

    @Column(name = "date_ordered")
    public LocalDate dateOrdered;

    @Column(name = "delivery_date")
    public LocalDate deliveryDate;

    @Column(name = "customer_po_ref", length = 40)
    public String customerPoRef;

    @Column(name = "atp_no", length = 40)
    public String atpNo;

    @Column(name = "atp_date")
    public LocalDate atpDate;

    @Column(name = "invoice_no", length = 40)
    public String invoiceNo;

    @Column(name = "invoice_date")
    public LocalDate invoiceDate;

    @Column(name = "or_no", length = 40)
    public String orNo;

    @Column(name = "or_date")
    public LocalDate orDate;

    @Column
    public Integer qty;

    @Column(length = 20)
    public String unit;

    @Column(length = 40)
    public String size;

    @Column(name = "unit_price", precision = 12, scale = 4)
    public BigDecimal unitPrice;

    @Column(length = 120)
    public String operator;

    @Column(length = 120)
    public String collator;

    @Column(name = "other_instructions", columnDefinition = "text")
    public String otherInstructions;

    @Column(name = "archived_at")
    public OffsetDateTime archivedAt;

    @OneToMany(mappedBy = "jobOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("lineNo")
    public List<JobOrderMaterial> materials = new ArrayList<>();

    public boolean isArchived() {
        return archivedAt != null;
    }

    public boolean isClosed() {
        return status == JobOrderStatus.CLOSED;
    }

    public int nextLineNo() {
        return materials.stream().mapToInt(m -> m.lineNo).max().orElse(0) + 1;
    }
}
