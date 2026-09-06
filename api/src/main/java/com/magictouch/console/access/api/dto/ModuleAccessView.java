package com.magictouch.console.access.api.dto;

import com.magictouch.console.access.data.AccessLevel;

/** One row of a user's access matrix. */
public record ModuleAccessView(String key, String name, AccessLevel access) {
}
