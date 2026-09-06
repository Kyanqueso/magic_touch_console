package com.magictouch.console;

import com.magictouch.console.access.domain.SupabaseAdminClient;
import com.magictouch.console.common.error.ApiException;
import io.quarkus.test.Mock;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Stands in for Supabase Auth so tests stay offline. Models the two behaviours
 * the service relies on: Supabase assigns the id, and duplicate emails fail.
 */
@Mock
@ApplicationScoped
public class FakeSupabaseAdminClient implements SupabaseAdminClient {

    private final Map<String, UUID> byEmail = Collections.synchronizedMap(new HashMap<>());
    private final Set<UUID> deleted = Collections.synchronizedSet(new HashSet<>());

    @Override
    public UUID createAuthUser(String email) {
        String key = email.trim().toLowerCase();
        if (byEmail.containsKey(key)) {
            throw ApiException.invalidField("email",
                    "A Supabase login already exists for this email. Remove it, or ask that person to sign in.");
        }
        UUID id = UUID.randomUUID();
        byEmail.put(key, id);
        return id;
    }

    @Override
    public void deleteAuthUser(UUID id) {
        deleted.add(id);
        byEmail.values().removeIf(id::equals);
    }

    // --- assertions for tests ---

    public boolean wasDeleted(UUID id) {
        return deleted.contains(id);
    }

    public boolean hasLoginFor(String email) {
        return byEmail.containsKey(email.trim().toLowerCase());
    }

    public UUID idFor(String email) {
        return byEmail.get(email.trim().toLowerCase());
    }
}
