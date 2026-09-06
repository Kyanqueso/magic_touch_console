package com.magictouch.console.profiles.domain;

import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import com.magictouch.console.profiles.api.dto.CorporateProfileRequest;
import com.magictouch.console.profiles.api.dto.CorporateProfileResponse;
import com.magictouch.console.profiles.api.dto.CorporateProfileSummary;
import com.magictouch.console.profiles.api.dto.RegistrationInput;
import com.magictouch.console.profiles.data.BusinessRegistration;
import com.magictouch.console.profiles.data.CorporateProfile;
import com.magictouch.console.profiles.data.CorporateProfileRepository;
import com.magictouch.console.profiles.data.FilingType;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class CorporateProfileService {

    private static final Map<String, String> SORTABLE = Map.of("name", "name", "createdAt", "createdAt");
    private static final Sort DEFAULT_SORT = Sort.by("createdAt", Sort.Direction.Descending);

    private final CorporateProfileRepository repo;
    private final EntityManager em;

    public CorporateProfileService(CorporateProfileRepository repo, EntityManager em) {
        this.repo = repo;
        this.em = em;
    }

    public PageResponse<CorporateProfileSummary> list(PageQuery page, String sort, String q, boolean archived) {
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<CorporateProfile> query = repo.search(archived, q, s);
        long total = query.count();
        List<CorporateProfileSummary> items = query.page(page.index(), page.size())
                .list().stream().map(CorporateProfileSummary::from).toList();
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

    private CorporateProfileResponse save(CorporateProfile p, CorporateProfileRequest body) {
        boolean existing = p.id != null;

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
