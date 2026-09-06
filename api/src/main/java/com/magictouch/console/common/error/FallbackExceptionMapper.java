package com.magictouch.console.common.error;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

/** Last resort: log the stack trace, return a generic 500. Never leak internals. */
@Provider
public class FallbackExceptionMapper implements ExceptionMapper<Exception> {

    private static final Logger LOG = Logger.getLogger(FallbackExceptionMapper.class);

    @Override
    public Response toResponse(Exception e) {
        if (e instanceof WebApplicationException wae) {
            return wae.getResponse();
        }
        LOG.error("Unhandled exception", e);
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(ErrorResponse.of("INTERNAL", "Something went wrong.", null))
                .build();
    }
}
