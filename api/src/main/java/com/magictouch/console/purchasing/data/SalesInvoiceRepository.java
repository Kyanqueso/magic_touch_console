package com.magictouch.console.purchasing.data;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class SalesInvoiceRepository implements PanacheRepository<SalesInvoice> {

    public PanacheQuery<SalesInvoice> search(long profileId, long supplierId, boolean archived,
                                             String term, Sort sort) {
        StringBuilder q = new StringBuilder(
                "corporateProfileId = :pid and purchaseOrder.supplier.id = :sid");
        Map<String, Object> params = new HashMap<>();
        params.put("pid", profileId);
        params.put("sid", supplierId);
        q.append(archived ? " and archivedAt is not null" : " and archivedAt is null");
        if (term != null && !term.isBlank()) {
            q.append(" and (cast(id as string) like :t or cast(sinvDate as string) like :t)");
            params.put("t", "%" + term.trim() + "%");
        }
        return find(q.toString(), sort, params);
    }

    // {salesInvoiceId -> line count + total} for a page of rows, in one grouped query.
    public Map<Long, LineSummary> lineSummaries(Collection<Long> invoiceIds) {
        if (invoiceIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = getEntityManager()
                .createQuery("""
                        select s.id, count(i.id), coalesce(sum(i.qty * i.unitPrice), 0)
                        from SalesInvoice s left join s.purchaseOrder.items i
                        where s.id in :ids
                        group by s.id
                        """, Object[].class)
                .setParameter("ids", invoiceIds)
                .getResultList();
        Map<Long, LineSummary> out = new HashMap<>();
        for (Object[] r : rows) {
            out.put((Long) r[0], LineSummary.of(r[1], r[2]));
        }
        return out;
    }
}
