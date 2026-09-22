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

    /** Inventory is per-profile: every query is scoped to one corporate profile. */
    public PanacheQuery<Material> search(long profileId, boolean archived, String term, Long groupId, Sort sort) {
        StringBuilder q = new StringBuilder("corporateProfileId = :profileId and ")
                .append(archived ? "archivedAt is not null" : "archivedAt is null");
        Map<String, Object> params = new HashMap<>();
        params.put("profileId", profileId);
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

    public Material findByCode(long profileId, String code) {
        return find("corporateProfileId = ?1 and code = ?2", profileId, code).firstResult();
    }
}
