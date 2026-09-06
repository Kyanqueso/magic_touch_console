package com.magictouch.console.access.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

/** {moduleKey -&gt; enabled}. Unlisted modules are untouched. */
public record ModuleGateRequest(@NotNull Map<String, Boolean> gates) {
}
