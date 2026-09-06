package com.magictouch.console.joborders.domain;

import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.model.Scope;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import com.magictouch.console.directory.data.Customer;
import com.magictouch.console.directory.data.CustomerRepository;
import com.magictouch.console.joborders.api.dto.JobOrderMaterialRequest;
import com.magictouch.console.joborders.api.dto.JobOrderMaterialResponse;
import com.magictouch.console.joborders.api.dto.JobOrderRequest;
import com.magictouch.console.joborders.api.dto.JobOrderResponse;
import com.magictouch.console.joborders.api.dto.JobOrderSummaryRow;
import com.magictouch.console.joborders.data.JobOrder;
import com.magictouch.console.joborders.data.JobOrderMaterial;
import com.magictouch.console.joborders.data.JobOrderRepository;
import com.magictouch.console.joborders.data.JobOrderStatus;
import com.magictouch.console.materials.data.Material;
import com.magictouch.console.materials.data.MaterialRepository;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@ApplicationScoped
public class JobOrderService {

    private static final Map<String, String> SORTABLE = Map.of("id", "id", "customer", "customer.name");
    private static final Sort DEFAULT_SORT = Sort.by("id", Sort.Direction.Descending);

    private final JobOrderRepository jobOrders;
    private final CustomerRepository customers; // cross-module FK target
    private final MaterialRepository materials;  // cross-module FK target

    public JobOrderService(JobOrderRepository jobOrders, CustomerRepository customers,
                           MaterialRepository materials) {
        this.jobOrders = jobOrders;
        this.customers = customers;
        this.materials = materials;
    }

    // --- job orders -------------------------------------------------------

    public PageResponse<JobOrderSummaryRow> list(long profileId, PageQuery page, String sort,
                                                 String q, boolean archived) {
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<JobOrder> query = jobOrders.search(profileId, archived, q, s);
        long total = query.count();
        List<JobOrderSummaryRow> items = query.page(page.index(), page.size())
                .list().stream().map(JobOrderSummaryRow::from).toList();
        return PageResponse.of(items, page, total);
    }

    public JobOrderResponse get(long profileId, long id) {
        return JobOrderResponse.from(require(profileId, id));
    }

    @Transactional
    public JobOrderResponse create(long profileId, JobOrderRequest body) {
        checkDates(body);
        JobOrder j = new JobOrder();
        j.corporateProfileId = profileId;
        j.status = JobOrderStatus.OPEN;
        j.customer = resolveCustomer(profileId, body.customerId());
        applyScalars(j, body);
        jobOrders.persist(j);
        return JobOrderResponse.from(j);
    }

    @Transactional
    public JobOrderResponse update(long profileId, long id, JobOrderRequest body) {
        JobOrder j = require(profileId, id);
        requireOpen(j);
        checkDates(body);
        j.customer = resolveCustomer(profileId, body.customerId());
        applyScalars(j, body);
        return JobOrderResponse.from(j);
    }

    @Transactional
    public JobOrderResponse close(long profileId, long id) {
        JobOrder j = require(profileId, id);
        j.status = JobOrderStatus.CLOSED;
        return JobOrderResponse.from(j);
    }

    @Transactional
    public JobOrderResponse reopen(long profileId, long id) {
        JobOrder j = require(profileId, id);
        j.status = JobOrderStatus.OPEN;
        return JobOrderResponse.from(j);
    }

    @Transactional
    public void archive(long profileId, long id) {
        JobOrder j = require(profileId, id);
        if (j.archivedAt == null) {
            j.archivedAt = OffsetDateTime.now();
        }
    }

    @Transactional
    public void restore(long profileId, long id) {
        require(profileId, id).archivedAt = null;
    }

    @Transactional
    public void delete(long profileId, long id) {
        JobOrder j = require(profileId, id);
        if (j.archivedAt == null) {
            throw ApiException.conflict("Archive the job order before deleting it.");
        }
        jobOrders.delete(j);
    }

    // --- materials on a job order ---------------------------------------

    public List<JobOrderMaterialResponse> listMaterials(long profileId, long jobId) {
        return require(profileId, jobId).materials.stream().map(JobOrderMaterialResponse::from).toList();
    }

    @Transactional
    public JobOrderMaterialResponse addMaterial(long profileId, long jobId, JobOrderMaterialRequest body) {
        JobOrder j = require(profileId, jobId);
        requireOpen(j);
        JobOrderMaterial m = new JobOrderMaterial();
        m.jobOrder = j;
        m.lineNo = j.nextLineNo();
        applyMaterial(m, body);
        j.materials.add(m);
        jobOrders.getEntityManager().flush();
        return JobOrderMaterialResponse.from(m);
    }

    @Transactional
    public JobOrderMaterialResponse updateMaterial(long profileId, long jobId, long materialLineId,
                                                   JobOrderMaterialRequest body) {
        JobOrder j = require(profileId, jobId);
        requireOpen(j);
        JobOrderMaterial m = j.materials.stream()
                .filter(x -> x.id.equals(materialLineId)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Material line"));
        applyMaterial(m, body);
        return JobOrderMaterialResponse.from(m);
    }

    @Transactional
    public void removeMaterial(long profileId, long jobId, long materialLineId) {
        JobOrder j = require(profileId, jobId);
        requireOpen(j);
        boolean removed = j.materials.removeIf(x -> x.id.equals(materialLineId));
        if (!removed) {
            throw ApiException.notFound("Material line");
        }
    }

    // --- helpers -------------------------------------------------------

    private JobOrder require(long profileId, long id) {
        JobOrder j = jobOrders.findById(id);
        if (j == null || !Objects.equals(j.corporateProfileId, profileId)) {
            throw ApiException.notFound("Job order");
        }
        return j;
    }

    private void requireOpen(JobOrder j) {
        if (j.isClosed()) {
            throw ApiException.conflict("Reopen the job order before editing it.");
        }
    }

    private Customer resolveCustomer(long profileId, Long customerId) {
        Customer c = customerId == null ? null : customers.findById(customerId);
        boolean visible = c != null
                && (c.scope == Scope.GLOBAL || Objects.equals(c.corporateProfileId, profileId));
        if (!visible) {
            throw ApiException.invalidField("customerId", "No such customer in this profile.");
        }
        return c;
    }

    private void applyScalars(JobOrder j, JobOrderRequest b) {
        j.branch = b.branch();
        j.seriesFrom = b.seriesFrom();
        j.seriesTo = b.seriesTo();
        j.jobDescription = b.jobDescription();
        j.specification = b.specification();
        j.equipment = b.equipment();
        j.dateOrdered = b.dateOrdered();
        j.deliveryDate = b.deliveryDate();
        j.customerPoRef = b.customerPoRef();
        j.atpNo = b.atpNo();
        j.atpDate = b.atpDate();
        j.invoiceNo = b.invoiceNo();
        j.invoiceDate = b.invoiceDate();
        j.orNo = b.orNo();
        j.orDate = b.orDate();
        j.qty = b.qty();
        j.unit = b.unit();
        j.size = b.size();
        j.unitPrice = b.unitPrice();
        j.operator = b.operator();
        j.collator = b.collator();
        j.otherInstructions = b.otherInstructions();
    }

    private void applyMaterial(JobOrderMaterial m, JobOrderMaterialRequest b) {
        Material material = b.materialId() == null ? null : materials.findById(b.materialId());
        if (material == null || material.isArchived()) {
            throw ApiException.invalidField("materialId", "No such active material.");
        }
        m.material = material;
        m.textColor = b.textColor();
        m.numberColor = b.numberColor();
        m.ink1 = b.ink1();
        m.ink2 = b.ink2();
        m.perforation1 = b.perforation1();
        m.perforation2 = b.perforation2();
        m.distribution = b.distribution();
        m.backCopy = b.backCopy();
        m.sizeNeeded = b.sizeNeeded();
        m.qtyNeeded = b.qtyNeeded();
    }

    private void checkDates(JobOrderRequest b) {
        Map<String, String> errs = new LinkedHashMap<>();
        if (b.dateOrdered() != null && b.deliveryDate() != null
                && b.deliveryDate().isBefore(b.dateOrdered())) {
            errs.put("deliveryDate", "Delivery is before the order date.");
        }
        Long from = asLong(b.seriesFrom());
        Long to = asLong(b.seriesTo());
        if (from != null && to != null && to < from) {
            errs.put("seriesTo", "Series To is lower than Series From.");
        }
        if (!errs.isEmpty()) {
            throw ApiException.invalidFields(errs);
        }
    }

    private static Long asLong(String s) {
        if (s == null || s.isBlank() || !s.chars().allMatch(Character::isDigit) || s.length() > 18) {
            return null;
        }
        return Long.parseLong(s);
    }
}
