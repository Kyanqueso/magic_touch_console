package com.magictouch.console.joborders.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record JobOrderMaterialRequest(
        @NotNull Long materialId,
        @Size(max = 40) String textColor,
        @Size(max = 40) String numberColor,
        @Size(max = 40) String ink1,
        @Size(max = 40) String ink2,
        @Size(max = 40) String perforation1,
        @Size(max = 40) String perforation2,
        @Size(max = 60) String distribution,
        @Size(max = 60) String backCopy,
        @PositiveOrZero Integer sizeNeeded,
        @PositiveOrZero Integer qtyNeeded
) {
}
