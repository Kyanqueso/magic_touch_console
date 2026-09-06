package com.magictouch.console.materials.data;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class MaterialRepository implements PanacheRepository<Material> {

    public PanacheQuery<Material> search(boolean archived, String term, Long groupId, Sort sort) {
        StringBuilder q = new StringBuilder(archived ? "archivedAt is not null" : "archivedAt is null");
        Map<String, Object> params = new HashMap<>();
        if (groupId != null) {
            q.append(" and materialGroup.id = :grp");
            params.put("grp", groupId);
        }
        if (term != null && !term.isBlank()) {
            q.append(" and (lower(code) like :t or lower(name) like :t)");
            params.put("t", "%" + term.trim().toLowerCase(Locale.ROOT) + "%");
        }
        return find(q.toString(), sort, params);
    }

    public Material findByCode(String code) {
        return find("code", code).firstResult();
    }
}
