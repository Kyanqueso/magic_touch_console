package com.magictouch.console.access.domain;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Maps a request path to the {@code modules.key} that guards it.
 * An unmapped path returns empty, which {@link AuthorizationService} treats as deny.
 */
public final class ModuleRoutes {

    /** Reachable by any signed-in user; the UI needs it to render the access matrix. */
    private static final List<Pattern> ALWAYS_ALLOWED = List.of(
            Pattern.compile("^modules$")
    );

    // First match wins, so nested paths come before the prefixes that would swallow them.
    private static final List<Route> ROUTES = List.of(
            new Route("^profiles/\\d+/suppliers/\\d+/(purchase-orders|sales-invoices|vouchers)(/.*)?$", "suppliers"),
            new Route("^profiles/\\d+/suppliers(/.*)?$", "suppliers"),
            new Route("^profiles/\\d+/customers(/.*)?$", "customers"),
            new Route("^profiles/\\d+/job-orders(/.*)?$", "job_orders"),
            new Route("^profiles/\\d+/modules$", "corporate_profiles"),
            new Route("^profiles(/.*)?$", "corporate_profiles"),
            new Route("^customers(/.*)?$", "customers"),
            new Route("^suppliers(/.*)?$", "suppliers"),
            new Route("^accounts(/.*)?$", "chart_of_accounts"),
            new Route("^account-categories(/.*)?$", "chart_of_accounts"),
            new Route("^materials(/.*)?$", "materials"),
            new Route("^material-groups(/.*)?$", "materials")
    );

    private ModuleRoutes() {
    }

    /** @param path request path with the leading slash and {@code api/v1/} stripped. */
    public static Optional<String> moduleFor(String path) {
        return ROUTES.stream()
                .filter(r -> r.pattern.matcher(path).matches())
                .findFirst()
                .map(r -> r.moduleKey);
    }

    public static boolean isAlwaysAllowed(String path) {
        return ALWAYS_ALLOWED.stream().anyMatch(p -> p.matcher(path).matches());
    }

    /** User administration, handled separately from the module matrix. */
    public static boolean isUserAdmin(String path) {
        return path.equals("users") || path.startsWith("users/");
    }

    private record Route(Pattern pattern, String moduleKey) {
        Route(String regex, String moduleKey) {
            this(Pattern.compile(regex), moduleKey);
        }
    }
}
