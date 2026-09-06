package com.magictouch.console.coa.data;

import com.magictouch.console.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "chart_of_accounts")
public class Account extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "account_category_id", nullable = false)
    public AccountCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_class", nullable = false, length = 10)
    public AccountClass accountClass;

    @Column(name = "sub_type", length = 40)
    public String subType;

    @Column(name = "account_code", nullable = false, length = 20)
    public String code;

    @Column(name = "account_name", nullable = false, length = 200)
    public String name;

    @Column(name = "atc_code", length = 10)
    public String atcCode;

    @Column(name = "tax_rate", precision = 5, scale = 2)
    public BigDecimal taxRate;

    @Column(name = "reference_form", length = 60)
    public String referenceForm;

    @Column(name = "archived_at")
    public OffsetDateTime archivedAt;

    public boolean isArchived() {
        return archivedAt != null;
    }
}
