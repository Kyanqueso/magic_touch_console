package com.magictouch.console.materials.api.dto;

import com.magictouch.console.materials.data.Material;

import java.math.BigDecimal;

// Minimal material row for a picker on another module's screen (job orders, purchasing).
public record MaterialOption(long id, String code, String name, BigDecimal unitPrice) {

    public static MaterialOption from(Material m) {
        return new MaterialOption(m.id, m.code, m.name, m.unitPrice);
    }
}
