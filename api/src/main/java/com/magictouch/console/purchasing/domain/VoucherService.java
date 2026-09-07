package com.magictouch.console.purchasing.domain;

import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import com.magictouch.console.profiles.domain.ProfileGuard;
import com.magictouch.console.purchasing.api.dto.VoucherRequest;
import com.magictouch.console.purchasing.api.dto.VoucherResponse;
import com.magictouch.console.purchasing.api.dto.VoucherSummaryRow;
import com.magictouch.console.purchasing.data.SalesInvoice;
import com.magictouch.console.purchasing.data.SalesInvoiceRepository;
import com.magictouch.console.purchasing.data.Voucher;
import com.magictouch.console.purchasing.data.VoucherRepository;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@ApplicationScoped
public class VoucherService {

    private static final Map<String, String> SORTABLE = Map.of("id", "id", "voucherDate", "voucherDate");
    private static final Sort DEFAULT_SORT = Sort.by("id", Sort.Direction.Descending);

    private final VoucherRepository repo;
    private final SalesInvoiceRepository invoices;
    private final PurchasingLookups lookups;
    private final ProfileGuard profileGuard;

    public VoucherService(VoucherRepository repo, SalesInvoiceRepository invoices,
                          PurchasingLookups lookups, ProfileGuard profileGuard) {
        this.repo = repo;
        this.invoices = invoices;
        this.lookups = lookups;
        this.profileGuard = profileGuard;
    }

    public PageResponse<VoucherSummaryRow> list(long profileId, long supplierId, PageQuery page,
                                                String sort, String q, boolean archived) {
        profileGuard.require(profileId);
        lookups.requireUsableSupplier(profileId, supplierId);
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<Voucher> query = repo.search(profileId, supplierId, archived, q, s);
        long total = query.count();
        List<VoucherSummaryRow> items = query.page(page.index(), page.size())
                .list().stream().map(VoucherSummaryRow::from).toList();
        return PageResponse.of(items, page, total);
    }

    public VoucherResponse get(long profileId, long supplierId, long id) {
        return VoucherResponse.from(require(profileId, supplierId, id));
    }

    @Transactional
    public VoucherResponse create(long profileId, long supplierId, VoucherRequest body) {
        profileGuard.require(profileId);
        lookups.requireUsableSupplier(profileId, supplierId);
        Voucher v = new Voucher();
        v.corporateProfileId = profileId;
        v.salesInvoice = requireInvoice(profileId, supplierId, body.salesInvoiceId());
        apply(v, body);
        repo.persist(v);
        return VoucherResponse.from(v);
    }

    @Transactional
    public VoucherResponse update(long profileId, long supplierId, long id, VoucherRequest body) {
        Voucher v = require(profileId, supplierId, id);
        requireActive(v);
        v.salesInvoice = requireInvoice(profileId, supplierId, body.salesInvoiceId());
        apply(v, body);
        return VoucherResponse.from(v);
    }

    @Transactional
    public VoucherResponse setPaid(long profileId, long supplierId, long id, boolean paid) {
        Voucher v = require(profileId, supplierId, id);
        requireActive(v);
        v.paid = paid;
        v.paidAt = paid ? OffsetDateTime.now() : null;
        return VoucherResponse.from(v);
    }

    @Transactional
    public void archive(long profileId, long supplierId, long id) {
        Voucher v = require(profileId, supplierId, id);
        if (v.archivedAt == null) {
            v.archivedAt = OffsetDateTime.now();
        }
    }

    @Transactional
    public void restore(long profileId, long supplierId, long id) {
        require(profileId, supplierId, id).archivedAt = null;
    }

    @Transactional
    public void delete(long profileId, long supplierId, long id) {
        Voucher v = require(profileId, supplierId, id);
        if (v.archivedAt == null) {
            throw ApiException.conflict("Archive the voucher before deleting it.");
        }
        repo.delete(v);
    }

    private Voucher require(long profileId, long supplierId, long id) {
        profileGuard.require(profileId);
        Voucher v = repo.findById(id);
        if (v == null || !Objects.equals(v.corporateProfileId, profileId)
                || !Objects.equals(v.salesInvoice.purchaseOrder.supplier.id, supplierId)) {
            throw ApiException.notFound("Voucher");
        }
        return v;
    }

    // An archived voucher is read-only until it is restored.
    private void requireActive(Voucher v) {
        if (v.archivedAt != null) {
            throw ApiException.conflict("Restore the voucher before editing it.");
        }
    }

    private SalesInvoice requireInvoice(long profileId, long supplierId, Long invoiceId) {
        SalesInvoice s = invoiceId == null ? null : invoices.findById(invoiceId);
        boolean ok = s != null && s.archivedAt == null
                && Objects.equals(s.corporateProfileId, profileId)
                && Objects.equals(s.purchaseOrder.supplier.id, supplierId);
        if (!ok) {
            throw ApiException.invalidField("salesInvoiceId",
                    "No such active sales invoice for this supplier.");
        }
        return s;
    }

    private void apply(Voucher v, VoucherRequest b) {
        lookups.checkAccount("debitAccountId", b.debitAccountId());
        lookups.checkAccount("creditCashAccountId", b.creditCashAccountId());
        lookups.checkAccount("creditPayableAccountId", b.creditPayableAccountId());
        v.voucherDate = b.voucherDate();
        v.netAmount = b.netAmount();
        v.paid = b.paid();
        v.paidAt = b.paid() ? (v.paidAt != null ? v.paidAt : OffsetDateTime.now()) : null;
        v.debitAccountId = b.debitAccountId();
        v.creditCashAccountId = b.creditCashAccountId();
        v.creditPayableAccountId = b.creditPayableAccountId();
    }
}
