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
