package com.magictouch.console.joborders.data;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class JobOrderRepository implements PanacheRepository<JobOrder> {

    public PanacheQuery<JobOrder> search(long profileId, boolean archived, String term, Sort sort) {
        StringBuilder q = new StringBuilder("corporateProfileId = :pid");
        Map<String, Object> params = new HashMap<>();
        params.put("pid", profileId);

        q.append(archived ? " and archivedAt is not null" : " and archivedAt is null");

        if (term != null && !term.isBlank()) {
            q.append(" and (cast(id as string) like :t"
                    + " or lower(customer.name) like :t"
                    + " or lower(jobDescription) like :t)");
            params.put("t", "%" + term.trim().toLowerCase(Locale.ROOT) + "%");
        }
        return find(q.toString(), sort, params);
    }
}
