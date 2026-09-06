package com.magictouch.console.profiles.data;

import com.magictouch.console.common.entity.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "corporate_profiles")
public class CorporateProfile extends BaseEntity {

    @Column(nullable = false, length = 200)
    public String name;

    @Column(columnDefinition = "text")
    public String address;

    @Column(length = 20)
    public String tin;

    @Column(length = 20)
    public String sss;

    @Column(length = 20)
    public String phic;

    @Column(length = 20)
    public String hdmf;

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

    @OneToMany(mappedBy = "profile", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<BusinessRegistration> registrations = new ArrayList<>();

    @OneToMany(mappedBy = "profile", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<FilingType> filingTypes = new ArrayList<>();

    public boolean isArchived() {
        return archivedAt != null;
    }

    /** The frontend's "Filled Up" vs "To be filled up" — derived, not a column. */
    public String status() {
        return (tin != null && !tin.isBlank()) ? "COMPLETE" : "DRAFT";
    }
}
