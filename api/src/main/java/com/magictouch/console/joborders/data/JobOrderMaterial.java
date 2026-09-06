package com.magictouch.console.joborders.data;

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

/** One material line on a job order, with its per-job print spec. */
@Entity
@Table(name = "job_order_materials")
public class JobOrderMaterial extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_order_id", nullable = false)
    public JobOrder jobOrder;

    // Cross-module FK target (materials).
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "material_id", nullable = false)
    public Material material;

    @Column(name = "line_no", nullable = false)
    public int lineNo;

    @Column(name = "text_color", length = 40)
    public String textColor;

    @Column(name = "number_color", length = 40)
    public String numberColor;

    @Column(length = 40)
    public String ink1;

    @Column(length = 40)
    public String ink2;

    @Column(length = 40)
    public String perforation1;

    @Column(length = 40)
    public String perforation2;

    @Column(length = 60)
    public String distribution;

    @Column(name = "back_copy", length = 60)
    public String backCopy;

    @Column(name = "size_needed")
    public Integer sizeNeeded;

    @Column(name = "qty_needed")
    public Integer qtyNeeded;
}
