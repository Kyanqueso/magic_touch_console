package com.magictouch.console.coa.data;

import com.magictouch.console.common.model.Scope;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class AccountRepository implements PanacheRepository<Account> {

    /**
     * Rows visible inside a corporate profile: every Global row, plus the Local
     * rows belonging to {@code profileId}. Narrowed by the archive tab, an
     * optional scope filter, an optional category, and an optional name search.
     */
    public PanacheQuery<Account> findVisible(long profileId, boolean archived, Scope scopeFilter,
                                             String term, Long categoryId, Sort sort) {
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
        if (categoryId != null) {
            q.append(" and category.id = :cat");
            params.put("cat", categoryId);
        }
        if (term != null && !term.isBlank()) {
            q.append(" and (lower(code) like :t or lower(name) like :t)");
            params.put("t", "%" + term.trim().toLowerCase(Locale.ROOT) + "%");
        }
        return find(q.toString(), sort, params);
    }

    /** Global rows only — the top-level Chart of Accounts page. */
    public PanacheQuery<Account> findGlobal(boolean archived, String term, Long categoryId, Sort sort) {
        StringBuilder q = new StringBuilder("scope = :global");
        Map<String, Object> params = new HashMap<>();
        params.put("global", Scope.GLOBAL);

        q.append(archived ? " and archivedAt is not null" : " and archivedAt is null");
        if (categoryId != null) {
            q.append(" and category.id = :cat");
            params.put("cat", categoryId);
        }
        if (term != null && !term.isBlank()) {
            q.append(" and (lower(code) like :t or lower(name) like :t)");
            params.put("t", "%" + term.trim().toLowerCase(Locale.ROOT) + "%");
        }
        return find(q.toString(), sort, params);
    }

    // True when another active row in the same profile scope already holds this code
    // (mirrors the partial unique index, which likewise only covers non-archived rows).
    public boolean codeTakenByAnother(Long scopeProfileId, String code, Long selfId) {
        StringBuilder q = new StringBuilder("archivedAt is null and code = :code");
        Map<String, Object> p = new HashMap<>();
        p.put("code", code.trim());
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
