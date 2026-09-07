package com.magictouch.console.purchasing.domain;

import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import com.magictouch.console.purchasing.api.dto.SupplierInvoiceRequest;
import com.magictouch.console.purchasing.api.dto.SupplierInvoiceResponse;
import com.magictouch.console.purchasing.api.dto.SupplierInvoiceSummaryRow;
import com.magictouch.console.purchasing.data.PurchaseOrder;
import com.magictouch.console.purchasing.data.PurchaseOrderRepository;
import com.magictouch.console.purchasing.data.SupplierInvoice;
import com.magictouch.console.purchasing.data.SupplierInvoiceRepository;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@ApplicationScoped
public class SupplierInvoiceService {

    private static final Map<String, String> SORTABLE = Map.of("id", "id", "sinvDate", "sinvDate");
    private static final Sort DEFAULT_SORT = Sort.by("id", Sort.Direction.Descending);

    private final SupplierInvoiceRepository repo;
    private final PurchaseOrderRepository purchaseOrders;
    private final PurchasingLookups lookups;

    public SupplierInvoiceService(SupplierInvoiceRepository repo, PurchaseOrderRepository purchaseOrders,
                                  PurchasingLookups lookups) {
        this.repo = repo;
        this.purchaseOrders = purchaseOrders;
        this.lookups = lookups;
    }

    public PageResponse<SupplierInvoiceSummaryRow> list(long profileId, long supplierId, PageQuery page,
                                                        String sort, String q, boolean archived) {
        lookups.requireUsableSupplier(profileId, supplierId);
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<SupplierInvoice> query = repo.search(profileId, supplierId, archived, q, s);
        long total = query.count();
        List<SupplierInvoiceSummaryRow> items = query.page(page.index(), page.size())
                .list().stream().map(SupplierInvoiceSummaryRow::from).toList();
        return PageResponse.of(items, page, total);
    }

    public SupplierInvoiceResponse get(long profileId, long supplierId, long id) {
        return SupplierInvoiceResponse.from(require(profileId, supplierId, id));
    }

    @Transactional
    public SupplierInvoiceResponse create(long profileId, long supplierId, SupplierInvoiceRequest body) {
        lookups.requireUsableSupplier(profileId, supplierId);
        SupplierInvoice s = new SupplierInvoice();
        s.corporateProfileId = profileId;
        s.purchaseOrder = requirePo(profileId, supplierId, body.purchaseOrderId());
        apply(s, body);
        repo.persist(s);
        return SupplierInvoiceResponse.from(s);
    }

    @Transactional
    public SupplierInvoiceResponse update(long profileId, long supplierId, long id, SupplierInvoiceRequest body) {
        SupplierInvoice s = require(profileId, supplierId, id);
        s.purchaseOrder = requirePo(profileId, supplierId, body.purchaseOrderId());
        apply(s, body);
        return SupplierInvoiceResponse.from(s);
    }

    @Transactional
    public void archive(long profileId, long supplierId, long id) {
        SupplierInvoice s = require(profileId, supplierId, id);
        if (s.archivedAt == null) {
            s.archivedAt = OffsetDateTime.now();
        }
    }

    @Transactional
    public void restore(long profileId, long supplierId, long id) {
        require(profileId, supplierId, id).archivedAt = null;
    }

    @Transactional
    public void delete(long profileId, long supplierId, long id) {
        SupplierInvoice s = require(profileId, supplierId, id);
        if (s.archivedAt == null) {
            throw ApiException.conflict("Archive the sales invoice before deleting it.");
        }
        repo.delete(s);
    }

    private SupplierInvoice require(long profileId, long supplierId, long id) {
        SupplierInvoice s = repo.findById(id);
        if (s == null || !Objects.equals(s.corporateProfileId, profileId)
                || !Objects.equals(s.purchaseOrder.supplier.id, supplierId)) {
            throw ApiException.notFound("Sales invoice");
        }
        return s;
    }

    private PurchaseOrder requirePo(long profileId, long supplierId, Long poId) {
        PurchaseOrder po = poId == null ? null : purchaseOrders.findById(poId);
        boolean ok = po != null && po.archivedAt == null
                && Objects.equals(po.corporateProfileId, profileId)
                && Objects.equals(po.supplier.id, supplierId);
        if (!ok) {
            throw ApiException.invalidField("purchaseOrderId", "No such active purchase order for this supplier.");
        }
        return po;
    }

    private void apply(SupplierInvoice s, SupplierInvoiceRequest b) {
        lookups.checkAccount("debitAccountId", b.debitAccountId());
        lookups.checkAccount("creditAccountId", b.creditAccountId());
        s.sinvDate = b.sinvDate();
        s.debitAccountId = b.debitAccountId();
        s.creditAccountId = b.creditAccountId();
    }
}
