package com.magictouch.console.purchasing.domain;

import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import com.magictouch.console.profiles.domain.ProfileGuard;
import com.magictouch.console.purchasing.api.dto.SalesInvoiceRequest;
import com.magictouch.console.purchasing.api.dto.SalesInvoiceResponse;
import com.magictouch.console.purchasing.api.dto.SalesInvoiceSummaryRow;
import com.magictouch.console.purchasing.data.LineSummary;
import com.magictouch.console.purchasing.data.PurchaseOrder;
import com.magictouch.console.purchasing.data.PurchaseOrderRepository;
import com.magictouch.console.purchasing.data.SalesInvoice;
import com.magictouch.console.purchasing.data.SalesInvoiceRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@ApplicationScoped
public class SalesInvoiceService {

    private static final Map<String, String> SORTABLE = Map.of("id", "id", "sinvDate", "sinvDate");
    private static final Sort DEFAULT_SORT = Sort.by("id", Sort.Direction.Descending);

    private final SalesInvoiceRepository repo;
    private final PurchaseOrderRepository purchaseOrders;
    private final PurchasingLookups lookups;
    private final ProfileGuard profileGuard;

    public SalesInvoiceService(SalesInvoiceRepository repo, PurchaseOrderRepository purchaseOrders,
                               PurchasingLookups lookups, ProfileGuard profileGuard) {
        this.repo = repo;
        this.purchaseOrders = purchaseOrders;
        this.lookups = lookups;
        this.profileGuard = profileGuard;
    }

    public PageResponse<SalesInvoiceSummaryRow> list(long profileId, long supplierId, PageQuery page,
                                                     String sort, String q, boolean archived) {
        profileGuard.require(profileId);
        lookups.requireUsableSupplier(profileId, supplierId);
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        var query = repo.search(profileId, supplierId, archived, q, s);
        long total = query.count();
        List<SalesInvoice> rows = query.page(page.index(), page.size()).list();
        Map<Long, LineSummary> sums = repo.lineSummaries(rows.stream().map(r -> r.id).toList());
        List<SalesInvoiceSummaryRow> items = rows.stream()
                .map(r -> SalesInvoiceSummaryRow.from(r, sums.getOrDefault(r.id, LineSummary.EMPTY)))
                .toList();
        return PageResponse.of(items, page, total);
    }

    public SalesInvoiceResponse get(long profileId, long supplierId, long id) {
        return SalesInvoiceResponse.from(require(profileId, supplierId, id));
    }

    @Transactional
    public SalesInvoiceResponse create(long profileId, long supplierId, SalesInvoiceRequest body) {
        profileGuard.require(profileId);
        lookups.requireUsableSupplier(profileId, supplierId);
        SalesInvoice s = new SalesInvoice();
        s.corporateProfileId = profileId;
        s.purchaseOrder = requirePo(profileId, supplierId, body.purchaseOrderId());
        apply(s, body);
        repo.persist(s);
        return SalesInvoiceResponse.from(s);
    }

    @Transactional
    public SalesInvoiceResponse update(long profileId, long supplierId, long id, SalesInvoiceRequest body) {
        SalesInvoice s = require(profileId, supplierId, id);
        requireActive(s);
        s.purchaseOrder = requirePo(profileId, supplierId, body.purchaseOrderId());
        apply(s, body);
        return SalesInvoiceResponse.from(s);
    }

    @Transactional
    public void archive(long profileId, long supplierId, long id) {
        SalesInvoice s = require(profileId, supplierId, id);
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
        SalesInvoice s = require(profileId, supplierId, id);
        if (s.archivedAt == null) {
            throw ApiException.conflict("Archive the sales invoice before deleting it.");
        }
        repo.delete(s);
    }

    private SalesInvoice require(long profileId, long supplierId, long id) {
        profileGuard.require(profileId);
        SalesInvoice s = repo.findById(id);
        if (s == null || !Objects.equals(s.corporateProfileId, profileId)
                || !Objects.equals(s.purchaseOrder.supplier.id, supplierId)) {
            throw ApiException.notFound("Sales invoice");
        }
        return s;
    }

    // An archived sales invoice is read-only until it is restored.
    private void requireActive(SalesInvoice s) {
        if (s.archivedAt != null) {
            throw ApiException.conflict("Restore the sales invoice before editing it.");
        }
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

    private void apply(SalesInvoice s, SalesInvoiceRequest b) {
        lookups.checkAccount("debitAccountId", b.debitAccountId());
        lookups.checkAccount("creditAccountId", b.creditAccountId());
        s.sinvDate = b.sinvDate();
        s.debitAccountId = b.debitAccountId();
        s.creditAccountId = b.creditAccountId();
    }
}
