package com.magictouch.console.purchasing.data;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class PurchaseOrderRepository implements PanacheRepository<PurchaseOrder> {

    public PanacheQuery<PurchaseOrder> search(long profileId, long supplierId, boolean archived,
                                              String term, Sort sort) {
        StringBuilder q = new StringBuilder("corporateProfileId = :pid and supplier.id = :sid");
        Map<String, Object> params = new HashMap<>();
        params.put("pid", profileId);
        params.put("sid", supplierId);
        q.append(archived ? " and archivedAt is not null" : " and archivedAt is null");
        if (term != null && !term.isBlank()) {
            // Match the PO number, its date, or the prepared/approved-by names.
            q.append(" and (cast(id as string) like :t"
                    + " or cast(poDate as string) like :t"
                    + " or lower(preparedBy) like :lt"
                    + " or lower(approvedBy) like :lt)");
            params.put("t", "%" + term.trim() + "%");
            params.put("lt", "%" + term.trim().toLowerCase(Locale.ROOT) + "%");
        }
        return find(q.toString(), sort, params);
    }

    // {purchaseOrderId -> line count + total} for a page of rows, in one grouped query.
    public Map<Long, LineSummary> itemSummaries(Collection<Long> poIds) {
        if (poIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = getEntityManager()
                .createQuery("""
                        select p.id, count(i.id), coalesce(sum(i.qty * i.unitPrice), 0)
                        from PurchaseOrder p left join p.items i
                        where p.id in :ids
                        group by p.id
                        """, Object[].class)
                .setParameter("ids", poIds)
                .getResultList();
        Map<Long, LineSummary> out = new HashMap<>();
        for (Object[] r : rows) {
            out.put((Long) r[0], LineSummary.of(r[1], r[2]));
        }
        return out;
    }
}
