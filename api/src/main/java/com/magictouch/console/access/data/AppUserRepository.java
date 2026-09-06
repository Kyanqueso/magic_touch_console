package com.magictouch.console.access.data;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class AppUserRepository implements PanacheRepositoryBase<AppUser, UUID> {

    /** @param excludeId dropped from results; keeps the caller out of their own user list. */
    public PanacheQuery<AppUser> search(String term, Sort sort, UUID excludeId) {
        Map<String, Object> p = new HashMap<>();
        StringBuilder q = new StringBuilder();

        if (term != null && !term.isBlank()) {
            p.put("t", "%" + term.trim().toLowerCase(Locale.ROOT) + "%");
            q.append("(lower(firstName) like :t or lower(lastName) like :t "
                    + "or lower(email) like :t or lower(employeeNo) like :t)");
        }
        if (excludeId != null) {
            p.put("me", excludeId);
            if (!q.isEmpty()) {
                q.append(" and ");
            }
            q.append("id <> :me");
        }
        return q.isEmpty() ? findAll(sort) : find(q.toString(), sort, p);
    }

    public Optional<AppUser> findByEmail(String email) {
        return find("lower(email) = ?1", email.trim().toLowerCase(Locale.ROOT)).firstResultOptional();
    }

    /** Next numeric employee number, starting at 1001, ignoring non-numeric values. */
    public String nextEmployeeNo() {
        Object max = getEntityManager()
                .createNativeQuery("select coalesce(max(employee_no::int), 1000) "
                        + "from app_users where employee_no ~ '^[0-9]+$'")
                .getSingleResult();
        long n = ((Number) max).longValue();
        return String.valueOf(Math.max(1000, n) + 1);
    }
}
