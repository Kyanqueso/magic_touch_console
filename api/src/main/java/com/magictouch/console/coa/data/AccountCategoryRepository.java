package com.magictouch.console.coa.data;

import com.magictouch.console.common.model.Scope;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class AccountCategoryRepository implements PanacheRepository<AccountCategory> {

    /** Every Global category, plus the Local categories of {@code profileId}. */
    public PanacheQuery<AccountCategory> findVisible(long profileId, Sort sort) {
        Map<String, Object> params = new HashMap<>();
        params.put("global", Scope.GLOBAL);
        params.put("profileId", profileId);
        return find("scope = :global or corporateProfileId = :profileId", sort, params);
    }

    /** Global categories only — the top-level Chart of Accounts page. */
    public PanacheQuery<AccountCategory> findGlobal(Sort sort) {
        return find("scope = ?1", sort, Scope.GLOBAL);
    }

    /**
     * Case-insensitive name match among the categories visible to {@code scopeProfileId}
     * ({@code null} means the global-only lookup) — the same predicate as {@link #findVisible}.
     */
    public Optional<AccountCategory> findByName(Long scopeProfileId, String name) {
        Map<String, Object> p = new HashMap<>();
        p.put("global", Scope.GLOBAL);
        p.put("name", name.trim().toLowerCase(Locale.ROOT));
        StringBuilder q = new StringBuilder("lower(name) = :name and (scope = :global");
        if (scopeProfileId != null) {
            q.append(" or corporateProfileId = :pid");
            p.put("pid", scopeProfileId);
        }
        q.append(")");
        return find(q.toString(), p).firstResultOptional();
    }
}
