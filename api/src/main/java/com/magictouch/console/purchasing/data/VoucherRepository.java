package com.magictouch.console.purchasing.data;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.Map;

@ApplicationScoped
public class VoucherRepository implements PanacheRepository<Voucher> {

    public PanacheQuery<Voucher> search(long profileId, long supplierId, boolean archived,
                                        String term, Sort sort) {
        StringBuilder q = new StringBuilder(
                "corporateProfileId = :pid and supplierInvoice.purchaseOrder.supplier.id = :sid");
        Map<String, Object> params = new HashMap<>();
        params.put("pid", profileId);
        params.put("sid", supplierId);
        q.append(archived ? " and archivedAt is not null" : " and archivedAt is null");
        if (term != null && !term.isBlank()) {
            q.append(" and cast(id as string) like :t");
            params.put("t", "%" + term.trim() + "%");
        }
        return find(q.toString(), sort, params);
    }
}
