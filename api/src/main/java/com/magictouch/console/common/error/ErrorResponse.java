package com.magictouch.console.common.error;

import java.util.Map;

/**
 * {@code { "error": { "code", "message", "fields" } }} — the shape the frontend's
 * per-field error handling already expects.
 */
public record ErrorResponse(Body error) {

    public record Body(String code, String message, Map<String, String> fields) {
    }

    public static ErrorResponse of(String code, String message, Map<String, String> fields) {
        return new ErrorResponse(new Body(code, message, fields));
    }
}
