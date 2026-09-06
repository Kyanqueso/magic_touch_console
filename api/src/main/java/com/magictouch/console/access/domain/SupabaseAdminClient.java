package com.magictouch.console.access.domain;

import java.util.UUID;

/**
 * Creates and removes logins in Supabase Auth.
 * An interface so tests can swap in a fake instead of calling a real project.
 */
public interface SupabaseAdminClient {

    /** Creates a confirmed, password-less login. Returns the id to use as app_users.id. */
    UUID createAuthUser(String email);

    /** Removes the login, so it cannot outlive the profile it belonged to. */
    void deleteAuthUser(UUID id);
}
