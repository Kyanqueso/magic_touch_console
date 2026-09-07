package com.magictouch.console.profiles.data;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class CorporateProfileRepository implements PanacheRepository<CorporateProfile> {

    // Whitelisted government-ID property names, so search() cannot be used to probe columns.
    private static final java.util.Set<String> GOV_ID_FIELDS = java.util.Set.of("tin", "sss", "phic", "hdmf");

    // True when another active profile already holds this value for the given government-ID field.
    public boolean govIdTakenByAnother(String field, String value, Long selfId) {
        if (!GOV_ID_FIELDS.contains(field)) {
            throw new IllegalArgumentException("Not a government-ID field: " + field);
        }
        return count("archivedAt is null and lower(" + field + ") = ?1 and (?2 is null or id <> ?2)",
                value.trim().toLowerCase(Locale.ROOT), selfId) > 0;
    }

    /** Active or archived profiles, optionally filtered by a name search. */
    public PanacheQuery<CorporateProfile> search(boolean archived, String term, Sort sort) {
        StringBuilder q = new StringBuilder(archived ? "archivedAt is not null" : "archivedAt is null");
        Map<String, Object> params = new HashMap<>();
        if (term != null && !term.isBlank()) {
            q.append(" and lower(name) like :term");
            params.put("term", "%" + term.trim().toLowerCase(Locale.ROOT) + "%");
        }
        return find(q.toString(), sort, params);
    }
}
