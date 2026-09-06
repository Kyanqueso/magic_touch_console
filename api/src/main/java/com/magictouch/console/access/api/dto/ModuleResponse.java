package com.magictouch.console.access.api.dto;

import com.magictouch.console.access.data.Module;

public record ModuleResponse(String key, String name, int sortOrder) {

    public static ModuleResponse from(Module m) {
        return new ModuleResponse(m.key, m.name, m.sortOrder);
    }
}
