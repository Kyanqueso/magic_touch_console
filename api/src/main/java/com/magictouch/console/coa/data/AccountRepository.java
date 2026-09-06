package com.magictouch.console.coa.data;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class AccountRepository implements PanacheRepository<Account> {

    public PanacheQuery<Account> search(boolean archived, String term, Long categoryId, Sort sort) {
        StringBuilder q = new StringBuilder(archived ? "archivedAt is not null" : "archivedAt is null");
        Map<String, Object> params = new HashMap<>();
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

    public Account findByCode(String code) {
        return find("code", code).firstResult();
    }
}
