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
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class MaterialService {

    private static final Map<String, String> SORTABLE = Map.of("code", "code", "unitPrice", "unitPrice");
    private static final Sort DEFAULT_SORT = Sort.by("code", Sort.Direction.Ascending);

    private final MaterialRepository materials;
    private final MaterialGroupRepository groups;

    public MaterialService(MaterialRepository materials, MaterialGroupRepository groups) {
        this.materials = materials;
        this.groups = groups;
    }

    // --- groups -------------------------------------------------------

    public List<MaterialGroupResponse> listGroups() {
        return groups.listAll(Sort.by("sortOrder").and("name")).stream()
                .map(MaterialGroupResponse::from).toList();
    }

    @Transactional
    public MaterialGroupResponse createGroup(MaterialGroupRequest body) {
        String name = body.name().trim();
        groups.findByName(name).ifPresent(g -> {
            throw ApiException.conflict("Group \"" + name + "\" already exists.");
        });
        MaterialGroup g = new MaterialGroup();
        g.name = name;
        g.sortOrder = 0;
        groups.persist(g);
        return MaterialGroupResponse.from(g);
    }

    // --- materials -------------------------------------------------------

    public PageResponse<MaterialResponse> list(PageQuery page, String sort, String q,
                                               boolean archived, Long groupId) {
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<Material> query = materials.search(archived, q, groupId, s);
        long total = query.count();
        List<MaterialResponse> items = query.page(page.index(), page.size())
                .list().stream().map(MaterialResponse::from).toList();
        return PageResponse.of(items, page, total);
    }

    public MaterialResponse get(long id) {
        return MaterialResponse.from(require(id));
    }

    @Transactional
    public MaterialResponse create(MaterialRequest body) {
        Material m = new Material();
        apply(m, body, null);
        materials.persist(m);
        return MaterialResponse.from(m);
    }

    @Transactional
    public MaterialResponse update(long id, MaterialRequest body) {
        Material m = require(id);
        apply(m, body, m.id);
        return MaterialResponse.from(m);
    }

    @Transactional
    public void archive(long id) {
        Material m = require(id);
        if (m.archivedAt == null) {
            m.archivedAt = OffsetDateTime.now();
        }
    }

    @Transactional
    public void restore(long id) {
        require(id).archivedAt = null;
    }

    @Transactional
    public void delete(long id) {
        Material m = require(id);
        if (m.archivedAt == null) {
            throw ApiException.conflict("Archive the material before deleting it.");
        }
        materials.delete(m);
    }

    private Material require(long id) {
        Material m = materials.findById(id);
        if (m == null) {
            throw ApiException.notFound("Material");
        }
        return m;
    }

    private void apply(Material m, MaterialRequest b, Long selfId) {
        String code = b.code().trim();
        Material clash = materials.findByCode(code);
        if (clash != null && !clash.id.equals(selfId)) {
            throw ApiException.conflict("Material code " + code + " is already in use.");
        }
        m.materialGroup = resolveGroup(b.group());
        m.code = code;
        m.name = b.name().trim();
        m.unitPrice = b.unitPrice();
    }

    private MaterialGroup resolveGroup(String name) {
        String trimmed = name.trim();
        return groups.findByName(trimmed).orElseGet(() -> {
            MaterialGroup g = new MaterialGroup();
            g.name = trimmed;
            g.sortOrder = 0;
            groups.persist(g);
            return g;
        });
    }
}
