package com.magictouch.console.materials.api.dto;

import com.magictouch.console.materials.data.Material;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record MaterialResponse(
        Long id,
        Long groupId,
        String groupName,
        String code,
        String name,
        BigDecimal unitPrice,
        boolean archived,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static MaterialResponse from(Material m) {
        return new MaterialResponse(
                m.id, m.materialGroup.id, m.materialGroup.name,
                m.code, m.name, m.unitPrice,
                m.isArchived(), m.createdAt, m.updatedAt);
    }
}
