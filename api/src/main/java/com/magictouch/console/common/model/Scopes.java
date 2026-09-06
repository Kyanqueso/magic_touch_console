package com.magictouch.console.common.model;

public final class Scopes {

    private Scopes() {
    }

    /** Parse a {@code scope} filter query param. {@code null} / "All" / unknown -&gt; no filter. */
    public static Scope filter(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Scope.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
