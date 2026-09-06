package com.magictouch.console.purchasing.data;

import com.magictouch.console.materials.data.Material;
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

import java.math.BigDecimal;

@Entity
@Table(name = "purchase_order_items")
public class PurchaseOrderItem extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    public PurchaseOrder purchaseOrder;

    // Cross-module FK target (materials).
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "material_id", nullable = false)
    public Material material;

    @Column(name = "line_no", nullable = false)
    public int lineNo;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal qty;

    @Column(nullable = false, length = 20)
    public String unit;

    // Snapshot at creation — does not follow later material price changes.
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 4)
    public BigDecimal unitPrice;

    public BigDecimal amount() {
        return qty.multiply(unitPrice);
    }
}
