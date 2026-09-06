package com.magictouch.console.materials.api.dto;

import com.magictouch.console.materials.data.MaterialGroup;

public record MaterialGroupResponse(Long id, String name, int sortOrder) {

    public static MaterialGroupResponse from(MaterialGroup g) {
        return new MaterialGroupResponse(g.id, g.name, g.sortOrder);
    }
}
