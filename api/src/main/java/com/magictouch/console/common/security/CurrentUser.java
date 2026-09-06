package com.magictouch.console.common.security;

import io.quarkus.arc.Arc;
import io.quarkus.security.identity.SecurityIdentity;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Optional;
import java.util.UUID;

/**
 * The current request's user id, from the access token's {@code sub} claim.
 * Equals {@code app_users.id}. Empty outside a request, so audit columns stay null.
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    // Static because AuditListener is a JPA listener and cannot inject.
    public static Optional<UUID> id() {
        var container = Arc.container();
        if (container == null || !container.requestContext().isActive()) {
            return Optional.empty();
        }
        SecurityIdentity identity = container.instance(SecurityIdentity.class).orElse(null);
        if (identity == null || identity.isAnonymous()) {
            return Optional.empty();
        }
        if (!(identity.getPrincipal() instanceof JsonWebToken jwt)) {
            return Optional.empty();
        }
        return parse(jwt.getSubject());
    }

    private static Optional<UUID> parse(String sub) {
        if (sub == null || sub.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(sub));
        } catch (IllegalArgumentException e) {
            // Not one of our tokens; leave the audit columns unset rather than failing.
            return Optional.empty();
        }
    }
}
