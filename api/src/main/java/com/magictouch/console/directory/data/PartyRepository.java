package com.magictouch.console.directory.data;

import com.magictouch.console.common.model.Scope;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** Shared query logic for the customer and supplier repositories. */
public abstract class PartyRepository<E extends Party> implements PanacheRepositoryBase<E, Long> {

    /**
     * Rows visible inside a corporate profile: every Global row, plus the Local
     * rows belonging to {@code profileId}. Narrowed by the archive tab, an
     * optional scope filter, and an optional name search.
     */
    public PanacheQuery<E> findVisible(long profileId, boolean archived, Scope scopeFilter,
                                       String term, Sort sort) {
        StringBuilder q = new StringBuilder("(scope = :global or corporateProfileId = :profileId)");
        Map<String, Object> params = new HashMap<>();
        params.put("global", Scope.GLOBAL);
        params.put("profileId", profileId);

        q.append(archived ? " and archivedAt is not null" : " and archivedAt is null");

        if (scopeFilter == Scope.GLOBAL) {
            q.append(" and scope = :global");
        } else if (scopeFilter == Scope.LOCAL) {
            q.append(" and corporateProfileId = :profileId");
        }

        if (term != null && !term.isBlank()) {
            q.append(" and lower(name) like :term");
            params.put("term", "%" + term.trim().toLowerCase(Locale.ROOT) + "%");
        }

        return find(q.toString(), sort, params);
    }

    /** Global rows only — the top-level Customers / Suppliers pages (no corporate profile). */
    public PanacheQuery<E> findGlobal(boolean archived, String term, Sort sort) {
        StringBuilder q = new StringBuilder("scope = :global");
        Map<String, Object> params = new HashMap<>();
        params.put("global", Scope.GLOBAL);

        q.append(archived ? " and archivedAt is not null" : " and archivedAt is null");

        if (term != null && !term.isBlank()) {
            q.append(" and lower(name) like :term");
            params.put("term", "%" + term.trim().toLowerCase(Locale.ROOT) + "%");
        }

        return find(q.toString(), sort, params);
    }
}
