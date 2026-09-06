package com.magictouch.console.materials.data;

import com.magictouch.console.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "materials")
public class Material extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "material_group_id", nullable = false)
    public MaterialGroup materialGroup;

    @Column(name = "material_code", nullable = false, length = 20)
    public String code;

    @Column(nullable = false, length = 160)
    public String name;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 4)
    public BigDecimal unitPrice;

    @Column(name = "archived_at")
    public OffsetDateTime archivedAt;

    public boolean isArchived() {
        return archivedAt != null;
    }
}
