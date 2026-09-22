package com.magictouch.console.materials.domain;

import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import com.magictouch.console.materials.api.dto.MaterialGroupRequest;
import com.magictouch.console.materials.api.dto.MaterialGroupResponse;
import com.magictouch.console.materials.api.dto.MaterialRequest;
import com.magictouch.console.materials.api.dto.MaterialResponse;
import com.magictouch.console.materials.data.Material;
import com.magictouch.console.materials.data.MaterialGroup;
import com.magictouch.console.materials.data.MaterialGroupRepository;
import com.magictouch.console.materials.data.MaterialRepository;
import com.magictouch.console.profiles.domain.ProfileGuard;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Inventory: each corporate profile keeps its own material list — no Global option. */
@ApplicationScoped
public class MaterialService {

    private static final Map<String, String> SORTABLE = Map.of("code", "code", "unitPrice", "unitPrice");
    private static final Sort DEFAULT_SORT = Sort.by("code", Sort.Direction.Ascending);

    private final MaterialRepository materials;
    private final MaterialGroupRepository groups;
    private final ProfileGuard profileGuard;

    public MaterialService(MaterialRepository materials, MaterialGroupRepository groups, ProfileGuard profileGuard) {
        this.materials = materials;
        this.groups = groups;
        this.profileGuard = profileGuard;
    }

    // --- groups -------------------------------------------------------

    public List<MaterialGroupResponse> listGroups(long profileId) {
        profileGuard.require(profileId);
        return groups.forProfile(profileId, Sort.by("sortOrder").and("name")).stream()
                .map(MaterialGroupResponse::from).toList();
    }

    @Transactional
    public MaterialGroupResponse createGroup(long profileId, MaterialGroupRequest body) {
        profileGuard.require(profileId);
        String name = body.name().trim();
        groups.findByName(profileId, name).ifPresent(g -> {
            throw ApiException.conflict("Group \"" + name + "\" already exists.");
        });
        MaterialGroup g = new MaterialGroup();
        g.corporateProfileId = profileId;
        g.name = name;
        g.sortOrder = 0;
        groups.persist(g);
        return MaterialGroupResponse.from(g);
    }

    // --- materials -------------------------------------------------------

    public PageResponse<MaterialResponse> list(long profileId, PageQuery page, String sort, String q,
                                               boolean archived, Long groupId) {
        profileGuard.require(profileId);
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<Material> query = materials.search(profileId, archived, q, groupId, s);
        long total = query.count();
        List<MaterialResponse> items = query.page(page.index(), page.size())
                .list().stream().map(MaterialResponse::from).toList();
        return PageResponse.of(items, page, total);
    }

    public MaterialResponse get(long profileId, long id) {
        return MaterialResponse.from(require(profileId, id));
    }

    @Transactional
    public MaterialResponse create(long profileId, MaterialRequest body) {
        profileGuard.require(profileId);
        Material m = new Material();
        m.corporateProfileId = profileId;
        apply(profileId, m, body, null);
        materials.persist(m);
        return MaterialResponse.from(m);
    }

    @Transactional
    public MaterialResponse update(long profileId, long id, MaterialRequest body) {
        Material m = require(profileId, id);
        apply(profileId, m, body, m.id);
        return MaterialResponse.from(m);
    }

    @Transactional
    public void archive(long profileId, long id) {
        Material m = require(profileId, id);
        if (m.archivedAt == null) {
            m.archivedAt = OffsetDateTime.now();
        }
    }

    @Transactional
    public void restore(long profileId, long id) {
        require(profileId, id).archivedAt = null;
    }

    @Transactional
    public void delete(long profileId, long id) {
        Material m = require(profileId, id);
        if (m.archivedAt == null) {
            throw ApiException.conflict("Archive the material before deleting it.");
        }
        materials.delete(m);
    }

    private Material require(long profileId, long id) {
        profileGuard.require(profileId);
        Material m = materials.findById(id);
        if (m == null || !Objects.equals(m.corporateProfileId, profileId)) {
            throw ApiException.notFound("Material");
        }
        return m;
    }

    private void apply(long profileId, Material m, MaterialRequest b, Long selfId) {
        String code = b.code().trim();
        Material clash = materials.findByCode(profileId, code);
        if (clash != null && !clash.id.equals(selfId)) {
            throw ApiException.conflict("Material code " + code + " is already in use.");
        }
        m.materialGroup = resolveGroup(profileId, b.group());
        m.code = code;
        m.name = b.name().trim();
        m.unitPrice = b.unitPrice();
    }

    private MaterialGroup resolveGroup(long profileId, String name) {
        String trimmed = name.trim();
        return groups.findByName(profileId, trimmed).orElseGet(() -> {
            MaterialGroup g = new MaterialGroup();
            g.corporateProfileId = profileId;
            g.name = trimmed;
            g.sortOrder = 0;
            groups.persist(g);
            return g;
        });
    }
}
