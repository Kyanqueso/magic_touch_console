package com.magictouch.console.directory.domain;

import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.model.Scope;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import com.magictouch.console.directory.api.dto.PartyRequest;
import com.magictouch.console.directory.api.dto.PartyResponse;
import com.magictouch.console.directory.data.Party;
import com.magictouch.console.directory.data.PartyRepository;
import com.magictouch.console.profiles.domain.ProfileGuard;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/** CRUD + list for a directory party. {@code CustomerService} / {@code SupplierService} bind the type. */
public abstract class PartyService<E extends Party> {

    private static final Map<String, String> SORTABLE =
            Map.of("name", "name", "id", "id", "createdAt", "createdAt");
    private static final Sort DEFAULT_SORT = Sort.by("name", Sort.Direction.Ascending);

    protected abstract PartyRepository<E> repo();

    protected abstract E newEntity();

    /** Lower-case noun for messages, e.g. {@code "customer"}. */
    protected abstract String noun();

    // Verifies the corporate profile in the path exists.
    protected abstract ProfileGuard profileGuard();

    public PageResponse<PartyResponse> list(long profileId, PageQuery page, String sort,
                                            String q, Scope scopeFilter, boolean archived) {
        profileGuard().require(profileId);
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<E> query = repo().findVisible(profileId, archived, scopeFilter, q, s);
        long total = query.count();
        List<PartyResponse> items = query.page(page.index(), page.size())
                .list().stream().map(PartyResponse::from).toList();
        return PageResponse.of(items, page, total);
    }

    public PartyResponse get(long profileId, long id) {
        return PartyResponse.from(require(profileId, id));
    }

    // --- Global (no corporate profile): the top-level Customers / Suppliers pages ---

    public PageResponse<PartyResponse> listGlobal(PageQuery page, String sort, String q, boolean archived) {
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<E> query = repo().findGlobal(archived, q, s);
        long total = query.count();
        List<PartyResponse> items = query.page(page.index(), page.size())
                .list().stream().map(PartyResponse::from).toList();
        return PageResponse.of(items, page, total);
    }

    public PartyResponse getGlobal(long id) {
        return PartyResponse.from(requireGlobal(id));
    }

    @Transactional
    public PartyResponse createGlobal(PartyRequest body) {
        E e = newEntity();
        applyGlobal(e, body);
        repo().persist(e);
        return PartyResponse.from(e);
    }

    @Transactional
    public PartyResponse updateGlobal(long id, PartyRequest body) {
        E e = requireGlobal(id);
        requireActive(e);
        applyGlobal(e, body);
        return PartyResponse.from(e);
    }

    @Transactional
    public void archiveGlobal(long id) {
        E e = requireGlobal(id);
        if (e.archivedAt == null) {
            e.archivedAt = OffsetDateTime.now();
        }
    }

    @Transactional
    public void restoreGlobal(long id) {
        requireGlobal(id).archivedAt = null;
    }

    @Transactional
    public void deleteGlobal(long id) {
        E e = requireGlobal(id);
        if (e.archivedAt == null) {
            throw ApiException.conflict("Archive the " + noun() + " before deleting it.");
        }
        repo().delete(e);
    }

    private E requireGlobal(long id) {
        E e = repo().findById(id);
        if (e == null || e.scope != Scope.GLOBAL) {
            throw ApiException.notFound(capitalizedNoun());
        }
        return e;
    }

    @Transactional
    public PartyResponse create(long profileId, PartyRequest body) {
        profileGuard().require(profileId);
        E e = newEntity();
        apply(e, body, profileId);
        repo().persist(e);
        return PartyResponse.from(e);
    }

    @Transactional
    public PartyResponse update(long profileId, long id, PartyRequest body) {
        E e = require(profileId, id);
        requireActive(e);
        apply(e, body, profileId);
        return PartyResponse.from(e);
    }

    @Transactional
    public void archive(long profileId, long id) {
        E e = require(profileId, id);
        if (e.archivedAt == null) {
            e.archivedAt = OffsetDateTime.now();
        }
    }

    @Transactional
    public void restore(long profileId, long id) {
        require(profileId, id).archivedAt = null;
    }

    @Transactional
    public void delete(long profileId, long id) {
        E e = require(profileId, id);
        if (e.archivedAt == null) {
            throw ApiException.conflict("Archive the " + noun() + " before deleting it.");
        }
        repo().delete(e);
    }

    protected E require(long profileId, long id) {
        profileGuard().require(profileId);
        E e = repo().findById(id);
        if (e == null || !visible(e, profileId)) {
            throw ApiException.notFound(capitalizedNoun());
        }
        return e;
    }

    // An archived record is read-only until it is restored.
    private void requireActive(E e) {
        if (e.archivedAt != null) {
            throw ApiException.conflict("Restore the " + noun() + " before editing it.");
        }
    }

    private boolean visible(E e, long profileId) {
        return e.scope == Scope.GLOBAL
                || (e.corporateProfileId != null && e.corporateProfileId == profileId);
    }

    private void apply(E e, PartyRequest body, long profileId) {
        e.scope = body.scope();
        e.corporateProfileId = body.scope() == Scope.LOCAL ? profileId : null;
        checkTin(e.corporateProfileId, body.tin(), e.id);
        applyFields(e, body);
    }

    private void applyGlobal(E e, PartyRequest body) {
        e.scope = Scope.GLOBAL;
        e.corporateProfileId = null;
        checkTin(null, body.tin(), e.id);
        applyFields(e, body);
    }

    // A TIN identifies one taxpayer, so it cannot repeat within a profile scope.
    private void checkTin(Long scopeProfileId, String tin, Long selfId) {
        if (tin != null && !tin.isBlank()
                && repo().tinTakenByAnother(scopeProfileId, tin, selfId)) {
            throw ApiException.invalidField("tin", "Another " + noun() + " already uses this TIN.");
        }
    }

    private void applyFields(E e, PartyRequest body) {
        e.name = body.name().trim();
        e.address = body.address();
        e.zipCode = body.zipCode();
        e.termsDays = body.termsDays() == null ? 0 : body.termsDays();
        e.tin = body.tin();
        e.branchCode = body.branchCode();
        e.companyType = body.companyType();
        e.taxType = body.taxType();
        e.wtaxAtc1 = body.wtaxAtc1();
        e.wtaxAtc1Rate = body.wtaxAtc1Rate();
        e.wtaxAtc2 = body.wtaxAtc2();
        e.wtaxAtc2Rate = body.wtaxAtc2Rate();
    }

    private String capitalizedNoun() {
        return Character.toUpperCase(noun().charAt(0)) + noun().substring(1);
    }
}
