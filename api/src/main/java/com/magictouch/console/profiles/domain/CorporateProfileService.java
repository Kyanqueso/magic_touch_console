package com.magictouch.console.profiles.domain;

import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import com.magictouch.console.access.data.CorporateProfileModuleRepository;
import com.magictouch.console.directory.data.CustomerRepository;
import com.magictouch.console.directory.data.SupplierRepository;
import com.magictouch.console.joborders.data.JobOrderRepository;
import com.magictouch.console.profiles.api.dto.CorporateProfileRequest;
import com.magictouch.console.profiles.api.dto.CorporateProfileResponse;
import com.magictouch.console.profiles.api.dto.CorporateProfileSummary;
import com.magictouch.console.profiles.api.dto.RegistrationInput;
import com.magictouch.console.profiles.data.BusinessRegistration;
import com.magictouch.console.profiles.data.BusinessRegistrationRepository;
import com.magictouch.console.profiles.data.CorporateProfile;
import com.magictouch.console.profiles.data.CorporateProfileRepository;
import com.magictouch.console.profiles.data.FilingType;
import com.magictouch.console.profiles.data.RegistrationBody;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@ApplicationScoped
public class CorporateProfileService {

    private static final Map<String, String> SORTABLE = Map.of("name", "name", "createdAt", "createdAt");
    private static final Sort DEFAULT_SORT = Sort.by("createdAt", Sort.Direction.Descending);
    private static final String JOB_ORDERS_MODULE = "job_orders";

    private final CorporateProfileRepository repo;
    private final BusinessRegistrationRepository registrations;
    private final EntityManager em;
    // Cross-module, for the list-card tags only.
    private final JobOrderRepository jobOrders;
    private final CustomerRepository customers;
    private final SupplierRepository suppliers;
    private final CorporateProfileModuleRepository profileModules;

    public CorporateProfileService(CorporateProfileRepository repo,
                                   BusinessRegistrationRepository registrations, EntityManager em,
                                   JobOrderRepository jobOrders, CustomerRepository customers,
                                   SupplierRepository suppliers,
                                   CorporateProfileModuleRepository profileModules) {
        this.repo = repo;
        this.registrations = registrations;
        this.em = em;
        this.jobOrders = jobOrders;
        this.customers = customers;
        this.suppliers = suppliers;
        this.profileModules = profileModules;
    }

    public PageResponse<CorporateProfileSummary> list(PageQuery page, String sort, String q, boolean archived) {
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<CorporateProfile> query = repo.search(archived, q, s);
        long total = query.count();
        List<CorporateProfile> rows = query.page(page.index(), page.size()).list();

        // Counts for the cards: a handful of grouped queries for the page rather
        // than a few per row.
        List<Long> ids = rows.stream().map(p -> p.id).toList();
        Map<Long, Long> jobOrderCounts = jobOrders.activeCountsByProfile(ids);
        Map<Long, Long> localCustomers = customers.activeLocalCountsByProfile(ids);
        Map<Long, Long> localSuppliers = suppliers.activeLocalCountsByProfile(ids);
        long globalCustomers = ids.isEmpty() ? 0 : customers.activeGlobalCount();
        long globalSuppliers = ids.isEmpty() ? 0 : suppliers.activeGlobalCount();
        Set<Long> jobOrdersOn = profileModules.enabledFor(ids, JOB_ORDERS_MODULE);

        List<CorporateProfileSummary> items = rows.stream()
                .map(p -> CorporateProfileSummary.from(
                        p,
                        jobOrdersOn.contains(p.id),
                        jobOrderCounts.getOrDefault(p.id, 0L),
                        localCustomers.getOrDefault(p.id, 0L) + globalCustomers,
                        localSuppliers.getOrDefault(p.id, 0L) + globalSuppliers))
                .toList();
        return PageResponse.of(items, page, total);
    }

    public CorporateProfileResponse get(long id) {
        return CorporateProfileResponse.from(require(id));
    }

    @Transactional
    public CorporateProfileResponse create(CorporateProfileRequest body) {
        return save(new CorporateProfile(), body);
    }

    @Transactional
    public CorporateProfileResponse update(long id, CorporateProfileRequest body) {
        return save(require(id), body);
    }

    @Transactional
    public void archive(long id) {
        CorporateProfile p = require(id);
        if (p.archivedAt == null) {
            p.archivedAt = OffsetDateTime.now();
        }
    }

    @Transactional
    public void restore(long id) {
        require(id).archivedAt = null;
    }

    @Transactional
    public void delete(long id) {
        CorporateProfile p = require(id);
        if (p.archivedAt == null) {
            throw ApiException.conflict("Archive the corporate profile before deleting it.");
        }
        repo.delete(p);
    }

    private CorporateProfile require(long id) {
        CorporateProfile p = repo.findById(id);
        if (p == null) {
            throw ApiException.notFound("Corporate profile");
        }
        return p;
    }

    // Government IDs and agency numbers are unique; WTAX codes and filing types must not repeat.
    private void validate(CorporateProfileRequest b, Long selfId) {
        Map<String, String> errs = new LinkedHashMap<>();
        checkGovId(errs, "tin", b.tin(), selfId, "TIN");
        checkGovId(errs, "sss", b.sss(), selfId, "SSS");
        checkGovId(errs, "phic", b.phic(), selfId, "PHIC");
        checkGovId(errs, "hdmf", b.hdmf(), selfId, "HDMF");

        String a1 = trimToNull(b.wtaxAtc1());
        String a2 = trimToNull(b.wtaxAtc2());
        if (a1 != null && a1.equalsIgnoreCase(a2)) {
            errs.put("wtaxAtc2", "WTAX ATC 1 and 2 must be different.");
        }

        if (b.filingTypes() != null) {
            List<String> cleaned = b.filingTypes().stream()
                    .filter(v -> v != null && !v.isBlank()).map(String::trim).toList();
            long distinct = cleaned.stream().map(v -> v.toLowerCase(Locale.ROOT)).distinct().count();
            if (distinct != cleaned.size()) {
                errs.put("filingTypes", "Filing tax types must all be different.");
            }
        }

        if (b.registrations() != null) {
            Set<RegistrationBody> seenBodies = new HashSet<>();
            for (RegistrationInput in : b.registrations()) {
                if (in.body() != null && !seenBodies.add(in.body())) {
                    errs.put("registrations", "Each agency can be registered only once.");
                }
                if (in.body() != null && in.registrationNo() != null
                        && registrations.numberTakenByAnother(in.body(), in.registrationNo(), selfId)) {
                    errs.put("registrations", in.body() + " registration number is already in use.");
                }
            }
        }

        if (!errs.isEmpty()) {
            throw ApiException.invalidFields(errs);
        }
    }

    private void checkGovId(Map<String, String> errs, String field, String value, Long selfId, String label) {
        String v = trimToNull(value);
        if (v != null && repo.govIdTakenByAnother(field, v, selfId)) {
            errs.put(field, "Another corporate profile already uses this " + label + ".");
        }
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private CorporateProfileResponse save(CorporateProfile p, CorporateProfileRequest body) {
        boolean existing = p.id != null;
        validate(body, p.id);

        p.name = body.name().trim();
        p.address = body.address();
        p.tin = body.tin();
        p.sss = body.sss();
        p.phic = body.phic();
        p.hdmf = body.hdmf();
        p.wtaxAtc1 = body.wtaxAtc1();
        p.wtaxAtc1Rate = body.wtaxAtc1Rate();
        p.wtaxAtc2 = body.wtaxAtc2();
        p.wtaxAtc2Rate = body.wtaxAtc2Rate();

        boolean cleared = false;
        if (body.registrations() != null) {
            p.registrations.clear();
            cleared = true;
        }
        if (body.filingTypes() != null) {
            p.filingTypes.clear();
            cleared = true;
        }
        // Run the orphan DELETEs before re-inserting, so the filing-type unique
        // index doesn't trip on an unchanged value.
        if (existing && cleared) {
            em.flush();
        }

        if (body.registrations() != null) {
            for (RegistrationInput in : body.registrations()) {
                BusinessRegistration r = new BusinessRegistration();
                r.profile = p;
                r.body = in.body();
                r.registrationNo = in.registrationNo().trim();
                r.registeredAt = in.registeredAt();
                r.expiresAt = in.expiresAt();
                p.registrations.add(r);
            }
        }
        if (body.filingTypes() != null) {
            body.filingTypes().stream()
                    .filter(v -> v != null && !v.isBlank())
                    .map(String::trim)
                    .distinct()
                    .forEach(v -> {
                        FilingType f = new FilingType();
                        f.profile = p;
                        f.value = v;
                        p.filingTypes.add(f);
                    });
        }

        repo.persist(p);
        em.flush(); // assign generated ids before mapping the response
        return CorporateProfileResponse.from(p);
    }
}
