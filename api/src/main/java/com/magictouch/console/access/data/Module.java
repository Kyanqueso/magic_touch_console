package com.magictouch.console.access.data;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A gated feature area. Seeded by migration, never retired — natural key. */
@Entity
@Table(name = "modules")
public class Module extends PanacheEntityBase {

    @Id
    @Column(length = 60)
    public String key;

    @Column(nullable = false, length = 120)
    public String name;

    @Column(name = "sort_order", nullable = false)
    public int sortOrder;
}
