package com.magictouch.console.common.error;

import jakarta.ws.rs.core.Response;

import java.util.Map;

/** A deliberate, client-facing failure. Rendered by {@link ApiExceptionMapper}. */
public class ApiException extends RuntimeException {

    private final Response.Status status;
    private final String code;
    private final transient Map<String, String> fields;

    public ApiException(Response.Status status, String code, String message, Map<String, String> fields) {
        super(message);
        this.status = status;
        this.code = code;
        this.fields = fields;
    }

    public static ApiException notFound(String what) {
        return new ApiException(Response.Status.NOT_FOUND, "NOT_FOUND", what + " was not found.", null);
    }

    public static ApiException conflict(String message) {
        return new ApiException(Response.Status.CONFLICT, "CONFLICT", message, null);
    }

    public static ApiException badRequest(String message) {
        return new ApiException(Response.Status.BAD_REQUEST, "BAD_REQUEST", message, null);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(Response.Status.FORBIDDEN, "FORBIDDEN", message, null);
    }

    /** A single field failed a rule the DTO annotations can't express (e.g. a cross-field or lookup check). */
    public static ApiException invalidField(String field, String message) {
        return new ApiException(Response.Status.BAD_REQUEST, "VALIDATION",
                "Some fields need attention.", Map.of(field, message));
    }

    public static ApiException invalidFields(Map<String, String> fields) {
        return new ApiException(Response.Status.BAD_REQUEST, "VALIDATION",
                "Some fields need attention.", fields);
    }

    public Response.Status status() {
        return status;
    }

    public String code() {
        return code;
    }

    public Map<String, String> fields() {
        return fields;
    }
}
