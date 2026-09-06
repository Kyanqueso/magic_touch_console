package com.magictouch.console.access.domain;

import com.magictouch.console.access.data.AccessLevel;
import com.magictouch.console.access.data.AppUser;
import com.magictouch.console.access.data.AppUserRepository;
import com.magictouch.console.access.data.UserModuleRepository;
import com.magictouch.console.access.data.UserRole;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Decides whether the signed-in caller may make this request.
 * Grants are read from the database, not the token, because admins edit them at runtime.
 */
@ApplicationScoped
public class AuthorizationService {

    private static final Pattern READ_METHODS = Pattern.compile("GET|HEAD|OPTIONS");

    /** Matches "users/{id}" and "users/{id}/anything". */
    private static final Pattern USER_PATH = Pattern.compile("^users/([^/]+)(/.*)?$");

    private final AppUserRepository users;
    private final UserModuleRepository userModules;

    public AuthorizationService(AppUserRepository users, UserModuleRepository userModules) {
        this.users = users;
        this.userModules = userModules;
    }

    public sealed interface Decision {
        record Allow() implements Decision { }

        /** 403, with a reason safe to show the caller. */
        record Deny(String reason) implements Decision { }

        /** 401 - the token is valid but has no app_users row. */
        record Unknown() implements Decision { }
    }

    private static final Decision ALLOW = new Decision.Allow();

    /** @param path request path with the leading slash and {@code api/v1/} stripped. */
    public Decision check(UUID userId, String path, String method) {
        AppUser user = users.findById(userId);
        if (user == null) {
            return new Decision.Unknown();
        }
        // Supabase still lets a disabled user sign in, so this is what stops them.
        if (user.isDisabled()) {
            return new Decision.Deny("This account has been disabled.");
        }

        if (ModuleRoutes.isAlwaysAllowed(path)) {
            return ALLOW;
        }
        if (ModuleRoutes.isUserAdmin(path)) {
            return checkUserAdmin(user, path, method);
        }
        if (user.role == UserRole.ADMIN) {
            return ALLOW;
        }

        // Fail closed: an unmapped endpoint is unreachable rather than open.
        String moduleKey = ModuleRoutes.moduleFor(path).orElse(null);
        if (moduleKey == null) {
            return new Decision.Deny("This endpoint is not available.");
        }

        AccessLevel level = levelFor(userId, moduleKey);
        if (level == AccessLevel.NO_ACCESS) {
            return new Decision.Deny("You do not have access to this module.");
        }
        if (level == AccessLevel.VIEWER && !isRead(method)) {
            return new Decision.Deny("You have view-only access to this module.");
        }
        return ALLOW;
    }

    /** Admin only, except that anyone may read and edit their own profile. */
    private Decision checkUserAdmin(AppUser user, String path, String method) {
        if (user.role == UserRole.ADMIN) {
            return ALLOW;
        }
        Matcher m = USER_PATH.matcher(path);
        boolean self = m.matches() && user.id.toString().equalsIgnoreCase(m.group(1));
        if (!self) {
            return new Decision.Deny("Only an administrator can manage users.");
        }
        String tail = m.group(2);
        // Reading your own grants is fine; granting yourself more is not.
        if (tail != null && tail.startsWith("/modules") && !isRead(method)) {
            return new Decision.Deny("You cannot change your own access.");
        }
        if ("DELETE".equalsIgnoreCase(method)) {
            return new Decision.Deny("You cannot delete your own account.");
        }
        return ALLOW;
    }

    private AccessLevel levelFor(UUID userId, String moduleKey) {
        return userModules.forUser(userId).stream()
                .filter(um -> um.moduleKey.equals(moduleKey))
                .map(um -> um.access)
                .findFirst()
                .orElse(AccessLevel.NO_ACCESS);
    }

    private static boolean isRead(String method) {
        return READ_METHODS.matcher(method.toUpperCase()).matches();
    }
}
