package com.magictouch.console;

import com.magictouch.console.access.data.AccessLevel;
import com.magictouch.console.access.data.AppUser;
import com.magictouch.console.access.data.AppUserRepository;
import com.magictouch.console.access.data.UserModule;
import com.magictouch.console.access.data.UserModuleRepository;
import com.magictouch.console.access.data.UserRole;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Creates app_users rows, since authorization rejects tokens for unknown users. */
@ApplicationScoped
public class TestUsers {

    /** Stable id so the functional tests reuse one admin row across the run. */
    public static final UUID ADMIN_ID = UUID.fromString("00000000-0000-4000-8000-000000000001");

    /** UUID-derived so it cannot collide with emails the resource tests generate. */
    private static String emailFor(UUID id, String prefix) {
        return prefix + "-" + id + "@test.invalid";
    }

    private final AppUserRepository users;
    private final UserModuleRepository userModules;

    public TestUsers(AppUserRepository users, UserModuleRepository userModules) {
        this.users = users;
        this.userModules = userModules;
    }

    /** The shared admin the resource tests run as. Idempotent. */
    @Transactional
    public UUID ensureAdmin() {
        AppUser existing = users.findById(ADMIN_ID);
        if (existing == null) {
            users.persist(newUser(ADMIN_ID, UserRole.ADMIN, emailFor(ADMIN_ID, "admin")));
        }
        return ADMIN_ID;
    }

    /** A plain USER with exactly one grant — for testing the matrix. */
    @Transactional
    public UUID withAccess(String moduleKey, AccessLevel level) {
        UUID id = UUID.randomUUID();
        users.persist(newUser(id, UserRole.USER, emailFor(id, "granted")));
        if (level != AccessLevel.NO_ACCESS) {
            UserModule um = new UserModule();
            um.userId = id;
            um.moduleKey = moduleKey;
            um.access = level;
            userModules.persist(um);
        }
        return id;
    }

    /** A USER with no grants at all. */
    @Transactional
    public UUID withNoAccess() {
        UUID id = UUID.randomUUID();
        users.persist(newUser(id, UserRole.USER, emailFor(id, "noaccess")));
        return id;
    }

    /** An ADMIN whose account has been disabled. */
    @Transactional
    public UUID disabledAdmin() {
        UUID id = UUID.randomUUID();
        AppUser u = newUser(id, UserRole.ADMIN, emailFor(id, "disabled"));
        u.disabledAt = OffsetDateTime.now();
        users.persist(u);
        return id;
    }

    private static AppUser newUser(UUID id, UserRole role, String email) {
        AppUser u = new AppUser();
        u.id = id;
        u.email = email;
        u.firstName = "Test";
        u.lastName = "User";
        u.role = role;
        return u;
    }
}
