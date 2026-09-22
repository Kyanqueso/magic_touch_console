package com.magictouch.console.directory.data;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Links a customer to the supplier created alongside it via "Also add as Supplier". */
@Entity
@Table(name = "party_links")
public class PartyLink extends PanacheEntityBase {

    @Id
    @Column(name = "customer_id")
    public Long customerId;

    @Column(name = "supplier_id", nullable = false)
    public Long supplierId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "created_by")
    public UUID createdBy;
}
