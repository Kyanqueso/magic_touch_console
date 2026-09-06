package com.magictouch.console.common.error;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class ApiExceptionMapper implements ExceptionMapper<ApiException> {

    @Override
    public Response toResponse(ApiException e) {
        return Response.status(e.status())
                .entity(ErrorResponse.of(e.code(), e.getMessage(), e.fields()))
                .build();
    }
}
