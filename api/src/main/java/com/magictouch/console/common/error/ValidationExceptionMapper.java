package com.magictouch.console.common.error;

import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import java.util.LinkedHashMap;
import java.util.Map;

/** Turns Bean Validation failures into the shared error envelope with a per-field map. */
@Provider
public class ValidationExceptionMapper implements ExceptionMapper<ConstraintViolationException> {

    @Override
    public Response toResponse(ConstraintViolationException e) {
        Map<String, String> fields = new LinkedHashMap<>();
        e.getConstraintViolations().forEach(v -> {
            String path = v.getPropertyPath().toString();
            int dot = path.lastIndexOf('.');
            fields.put(dot >= 0 ? path.substring(dot + 1) : path, v.getMessage());
        });
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(ErrorResponse.of("VALIDATION", "Some fields need attention.", fields))
                .build();
    }
}
