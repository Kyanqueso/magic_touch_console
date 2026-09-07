package com.magictouch.console.purchasing.domain;

import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import com.magictouch.console.materials.api.dto.MaterialOption;
import com.magictouch.console.materials.data.Material;
import com.magictouch.console.materials.data.MaterialRepository;
import com.magictouch.console.profiles.domain.ProfileGuard;
import com.magictouch.console.purchasing.api.dto.PurchaseOrderItemRequest;
import com.magictouch.console.purchasing.api.dto.PurchaseOrderItemResponse;
import com.magictouch.console.purchasing.api.dto.PurchaseOrderRequest;
import com.magictouch.console.purchasing.api.dto.PurchaseOrderResponse;
import com.magictouch.console.purchasing.api.dto.PurchaseOrderSummaryRow;
import com.magictouch.console.purchasing.data.LineSummary;
import com.magictouch.console.purchasing.data.PurchaseOrder;
import com.magictouch.console.purchasing.data.PurchaseOrderItem;
import com.magictouch.console.purchasing.data.PurchaseOrderRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@ApplicationScoped
public class PurchaseOrderService {

    private static final Map<String, String> SORTABLE = Map.of("id", "id", "poDate", "poDate");
    private static final Sort DEFAULT_SORT = Sort.by("id", Sort.Direction.Descending);
    private static final int MAX_ITEMS = 10;

    private final PurchaseOrderRepository repo;
    private final MaterialRepository materials;
    private final PurchasingLookups lookups;
    private final ProfileGuard profileGuard;

    public PurchaseOrderService(PurchaseOrderRepository repo, MaterialRepository materials,
                                PurchasingLookups lookups, ProfileGuard profileGuard) {
        this.repo = repo;
        this.materials = materials;
        this.lookups = lookups;
        this.profileGuard = profileGuard;
    }

    public PageResponse<PurchaseOrderSummaryRow> list(long profileId, long supplierId, PageQuery page,
                                                      String sort, String q, boolean archived) {
        profileGuard.require(profileId);
        lookups.requireUsableSupplier(profileId, supplierId);
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        var query = repo.search(profileId, supplierId, archived, q, s);
        long total = query.count();
        List<PurchaseOrder> rows = query.page(page.index(), page.size()).list();
        Map<Long, LineSummary> sums = repo.itemSummaries(rows.stream().map(r -> r.id).toList());
        List<PurchaseOrderSummaryRow> items = rows.stream()
                .map(r -> PurchaseOrderSummaryRow.from(r, sums.getOrDefault(r.id, LineSummary.EMPTY)))
                .toList();
        return PageResponse.of(items, page, total);
    }

    public PurchaseOrderResponse get(long profileId, long supplierId, long id) {
        return PurchaseOrderResponse.from(require(profileId, supplierId, id));
    }

    // Material picker for the PO screen. Gated by the suppliers module (the PO path),
    // so a purchasing user needs no materials grant of their own.
    public List<MaterialOption> materialOptions() {
        return materials.search(false, null, null, Sort.by("code"))
                .list().stream().map(MaterialOption::from).toList();
    }

    @Transactional
    public PurchaseOrderResponse create(long profileId, long supplierId, PurchaseOrderRequest body) {
        profileGuard.require(profileId);
        PurchaseOrder po = new PurchaseOrder();
        po.corporateProfileId = profileId;
        po.supplier = lookups.requireUsableSupplier(profileId, supplierId);
        apply(po, body);
        repo.persist(po);
        return PurchaseOrderResponse.from(po);
    }

    @Transactional
    public PurchaseOrderResponse update(long profileId, long supplierId, long id, PurchaseOrderRequest body) {
        PurchaseOrder po = require(profileId, supplierId, id);
        requireActive(po);
        apply(po, body);
        return PurchaseOrderResponse.from(po);
    }

    @Transactional
    public void archive(long profileId, long supplierId, long id) {
        PurchaseOrder po = require(profileId, supplierId, id);
        if (po.archivedAt == null) {
            po.archivedAt = OffsetDateTime.now();
        }
    }

    @Transactional
    public void restore(long profileId, long supplierId, long id) {
        require(profileId, supplierId, id).archivedAt = null;
    }

    @Transactional
    public void delete(long profileId, long supplierId, long id) {
        PurchaseOrder po = require(profileId, supplierId, id);
        if (po.archivedAt == null) {
            throw ApiException.conflict("Archive the purchase order before deleting it.");
        }
        repo.delete(po);
    }

    // --- line items ---------------------------------------------------

    public List<PurchaseOrderItemResponse> listItems(long profileId, long supplierId, long poId) {
        return require(profileId, supplierId, poId).items.stream()
                .map(PurchaseOrderItemResponse::from).toList();
    }

    @Transactional
    public PurchaseOrderItemResponse addItem(long profileId, long supplierId, long poId,
                                             PurchaseOrderItemRequest body) {
        PurchaseOrder po = require(profileId, supplierId, poId);
        requireActive(po);
        // Lock and reload the parent so two concurrent adds cannot pick the same line_no.
        repo.getEntityManager().refresh(po, LockModeType.PESSIMISTIC_WRITE);
        if (po.items.size() >= MAX_ITEMS) {
            throw ApiException.conflict("A purchase order can hold at most " + MAX_ITEMS + " lines.");
        }
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.purchaseOrder = po;
        item.lineNo = po.nextLineNo();
        applyItem(item, body);
        po.items.add(item);
        repo.getEntityManager().flush();
        return PurchaseOrderItemResponse.from(item);
    }

    @Transactional
    public PurchaseOrderItemResponse updateItem(long profileId, long supplierId, long poId, long itemId,
                                                PurchaseOrderItemRequest body) {
        PurchaseOrder po = require(profileId, supplierId, poId);
        requireActive(po);
        PurchaseOrderItem item = po.items.stream()
                .filter(i -> i.id.equals(itemId)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Line item"));
        applyItem(item, body);
        return PurchaseOrderItemResponse.from(item);
    }

    @Transactional
    public void removeItem(long profileId, long supplierId, long poId, long itemId) {
        PurchaseOrder po = require(profileId, supplierId, poId);
        requireActive(po);
        if (!po.items.removeIf(i -> i.id.equals(itemId))) {
            throw ApiException.notFound("Line item");
        }
    }

    // --- helpers ---------------------------------------------------

    private PurchaseOrder require(long profileId, long supplierId, long id) {
        profileGuard.require(profileId);
        PurchaseOrder po = repo.findById(id);
        if (po == null || !Objects.equals(po.corporateProfileId, profileId)
                || !Objects.equals(po.supplier.id, supplierId)) {
            throw ApiException.notFound("Purchase order");
        }
        return po;
    }

    // An archived purchase order is read-only until it is restored.
    private void requireActive(PurchaseOrder po) {
        if (po.archivedAt != null) {
            throw ApiException.conflict("Restore the purchase order before editing it.");
        }
    }

    private void apply(PurchaseOrder po, PurchaseOrderRequest b) {
        po.poDate = b.poDate();
        po.preparedBy = b.preparedBy();
        po.preparedDate = b.preparedDate();
        po.approvedBy = b.approvedBy();
        po.approvedDate = b.approvedDate();
    }

    private void applyItem(PurchaseOrderItem item, PurchaseOrderItemRequest b) {
        Material material = b.materialId() == null ? null : materials.findById(b.materialId());
        if (material == null || material.isArchived()) {
            throw ApiException.invalidField("materialId", "No such active material.");
        }
        item.material = material;
        item.qty = b.qty();
        item.unit = (b.unit() == null || b.unit().isBlank()) ? "Pcs" : b.unit().trim();
        item.unitPrice = b.unitPrice() != null ? b.unitPrice() : material.unitPrice;
    }
}
