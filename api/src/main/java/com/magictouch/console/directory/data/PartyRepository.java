package com.magictouch.console.directory.data;

import com.magictouch.console.common.model.Scope;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/** Shared query logic for the customer and supplier repositories. */
public abstract class PartyRepository<E extends Party> implements PanacheRepositoryBase<E, Long> {

    /** JPQL entity name, so the grouped count below can be written once. */
    protected abstract String entityName();

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

    /**
     * Active Local rows per profile, for the corporate-profile cards. One
     * grouped query for the whole page rather than a count per card. Global
     * rows are shared, so {@link #activeGlobalCount()} is added on top.
     */
    public Map<Long, Long> activeLocalCountsByProfile(Collection<Long> profileIds) {
        if (profileIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = getEntityManager()
                .createQuery("""
                        select p.corporateProfileId, count(p) from %s p
                        where p.corporateProfileId in :ids
                          and p.scope = :local
                          and p.archivedAt is null
                        group by p.corporateProfileId
                        """.formatted(entityName()), Object[].class)
                .setParameter("ids", profileIds)
                .setParameter("local", Scope.LOCAL)
                .getResultList();
        return rows.stream().collect(Collectors.toMap(r -> (Long) r[0], r -> (Long) r[1]));
    }

    /** Active Global rows, which every profile can use. */
    public long activeGlobalCount() {
        return count("scope = ?1 and archivedAt is null", Scope.GLOBAL);
    }

    // True when another active row in the same profile scope already holds this TIN.
    public boolean tinTakenByAnother(Long scopeProfileId, String tin, Long selfId) {
        StringBuilder q = new StringBuilder("archivedAt is null and tin = :tin");
        Map<String, Object> p = new HashMap<>();
        p.put("tin", tin.trim());
        if (scopeProfileId == null) {
            q.append(" and corporateProfileId is null");
        } else {
            q.append(" and corporateProfileId = :pid");
            p.put("pid", scopeProfileId);
        }
        if (selfId != null) {
            q.append(" and id <> :self");
            p.put("self", selfId);
        }
        return count(q.toString(), p) > 0;
    }
}
