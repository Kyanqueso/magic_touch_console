package com.magictouch.console.profiles.data;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** One BIR filing type (e.g. "1601C") on a corporate profile. Growable list in the UI. */
@Entity
@Table(name = "corporate_profile_filing_types")
public class FilingType extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "corporate_profile_id", nullable = false)
    public CorporateProfile profile;

    @Column(name = "filing_type", nullable = false, length = 20)
    public String value;
}
