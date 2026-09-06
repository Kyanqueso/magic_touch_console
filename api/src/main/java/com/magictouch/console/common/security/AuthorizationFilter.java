package com.magictouch.console.common.security;

import com.magictouch.console.access.domain.AuthorizationService;
import com.magictouch.console.common.error.ErrorResponse;
import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;

import java.util.UUID;

/**
 * Applies the module access matrix to every {@code /api/} request.
 * One filter rather than annotations, so a new resource cannot ship ungated.
 */
@Provider
@Priority(Priorities.AUTHORIZATION)
public class AuthorizationFilter implements ContainerRequestFilter {

    private static final String API_PREFIX = "api/v1/";

    private final AuthorizationService authorization;

    public AuthorizationFilter(AuthorizationService authorization) {
        this.authorization = authorization;
    }

    @Override
    public void filter(ContainerRequestContext ctx) {
        String path = ctx.getUriInfo().getPath();
        if (path.startsWith("/")) {
            path = path.substring(1);
        }
        if (!path.startsWith(API_PREFIX)) {
            return;
        }
        path = path.substring(API_PREFIX.length());

        // Preflight carries no Authorization header by design.
        if ("OPTIONS".equalsIgnoreCase(ctx.getMethod())) {
            return;
        }

        UUID userId = CurrentUser.id().orElse(null);
        if (userId == null) {
            abort(ctx, Response.Status.UNAUTHORIZED, "UNAUTHENTICATED", "Authentication required.");
            return;
        }

        switch (authorization.check(userId, path, ctx.getMethod())) {
            case AuthorizationService.Decision.Allow ignored -> {
                // proceed
            }
            case AuthorizationService.Decision.Unknown ignored -> abort(
                    ctx, Response.Status.UNAUTHORIZED, "UNKNOWN_USER",
                    "This login has no console profile. Ask an administrator to add you.");
            case AuthorizationService.Decision.Deny deny -> abort(
                    ctx, Response.Status.FORBIDDEN, "FORBIDDEN", deny.reason());
        }
    }

    private static void abort(ContainerRequestContext ctx, Response.Status status,
                              String code, String message) {
        ctx.abortWith(Response.status(status)
                .type(MediaType.APPLICATION_JSON)
                .entity(ErrorResponse.of(code, message, null))
                .build());
    }
}
