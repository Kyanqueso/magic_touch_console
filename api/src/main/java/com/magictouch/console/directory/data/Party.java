package com.magictouch.console.directory.data;

import com.magictouch.console.common.entity.BaseEntity;
import com.magictouch.console.common.model.Scope;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.MappedSuperclass;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * The columns customers and suppliers share. They stay two separate tables
 * (and two {@code @Entity} subclasses); this superclass only keeps the mapping
 * and column list in one place.
 */
@MappedSuperclass
public abstract class Party extends BaseEntity {

    @Column(name = "corporate_profile_id")
    public Long corporateProfileId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 6)
    public Scope scope;

    @Column(nullable = false, length = 200)
    public String name;

    @Column(columnDefinition = "text")
    public String address;

    @Column(name = "zip_code", length = 20)
    public String zipCode;

    @Column(name = "terms_days", nullable = false)
    public int termsDays;

    @Column(length = 20)
    public String tin;

    @Column(name = "branch_code", length = 10)
    public String branchCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", length = 20)
    public CompanyType companyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_type", length = 20)
    public TaxType taxType;

    @Column(name = "wtax_atc1", length = 10)
    public String wtaxAtc1;

    @Column(name = "wtax_atc1_rate", precision = 5, scale = 2)
    public BigDecimal wtaxAtc1Rate;

    @Column(name = "wtax_atc2", length = 10)
    public String wtaxAtc2;

    @Column(name = "wtax_atc2_rate", precision = 5, scale = 2)
    public BigDecimal wtaxAtc2Rate;

    @Column(name = "archived_at")
    public OffsetDateTime archivedAt;

    public boolean isArchived() {
        return archivedAt != null;
    }
}
