package com.magictouch.console.access.api.dto;

/** Whether a module is switched on for a corporate profile. */
public record ModuleGateView(String key, String name, boolean enabled) {
}
