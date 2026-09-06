package com.magictouch.console.joborders.api.dto;

import com.magictouch.console.joborders.data.JobOrderMaterial;

public record JobOrderMaterialResponse(
        Long id,
        int lineNo,
        Long materialId,
        String materialCode,
        String materialName,
        String textColor,
        String numberColor,
        String ink1,
        String ink2,
        String perforation1,
        String perforation2,
        String distribution,
        String backCopy,
        Integer sizeNeeded,
        Integer qtyNeeded
) {

    public static JobOrderMaterialResponse from(JobOrderMaterial m) {
        return new JobOrderMaterialResponse(
                m.id, m.lineNo,
                m.material.id, m.material.code, m.material.name,
                m.textColor, m.numberColor, m.ink1, m.ink2,
                m.perforation1, m.perforation2, m.distribution, m.backCopy,
                m.sizeNeeded, m.qtyNeeded);
    }
}
