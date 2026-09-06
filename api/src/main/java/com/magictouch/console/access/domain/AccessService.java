package com.magictouch.console.access.domain;

import com.magictouch.console.access.api.dto.ModuleAccessView;
import com.magictouch.console.access.api.dto.ModuleGateView;
import com.magictouch.console.access.api.dto.ModuleResponse;
import com.magictouch.console.access.api.dto.UserRequest;
import com.magictouch.console.access.api.dto.UserResponse;
import com.magictouch.console.access.api.dto.UserSummaryRow;
import com.magictouch.console.access.data.AccessLevel;
import com.magictouch.console.access.data.AppUser;
import com.magictouch.console.access.data.AppUserRepository;
import com.magictouch.console.access.data.CorporateProfileModule;
import com.magictouch.console.access.data.CorporateProfileModuleRepository;
import com.magictouch.console.access.data.Module;
import com.magictouch.console.access.data.ModuleRepository;
import com.magictouch.console.access.data.UserModule;
import com.magictouch.console.access.data.UserModuleRepository;
import com.magictouch.console.access.data.UserRole;
import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.security.CurrentUser;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import com.magictouch.console.profiles.data.CorporateProfileRepository;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class AccessService {

    private static final Map<String, String> SORTABLE =
            Map.of("lastName", "lastName", "employeeNo", "employeeNo", "createdAt", "createdAt");
    private static final Sort DEFAULT_SORT = Sort.by("lastName", Sort.Direction.Ascending).and("firstName");

    private final AppUserRepository users;
    private final ModuleRepository modules;
    private final UserModuleRepository userModules;
    private final CorporateProfileModuleRepository profileModules;
    private final CorporateProfileRepository profiles; // cross-module: validate the profile exists
    private final SupabaseAdminClient supabase;

    public AccessService(AppUserRepository users, ModuleRepository modules,
                         UserModuleRepository userModules,
                         CorporateProfileModuleRepository profileModules,
                         CorporateProfileRepository profiles,
                         SupabaseAdminClient supabase) {
        this.users = users;
        this.modules = modules;
        this.userModules = userModules;
        this.profileModules = profileModules;
        this.profiles = profiles;
        this.supabase = supabase;
    }

    // --- modules -------------------------------------------------------

    public List<ModuleResponse> listModules() {
        return modules.allOrdered().stream().map(ModuleResponse::from).toList();
    }

    // --- users -------------------------------------------------------

    /** Excludes the caller, so nobody can delete themselves and lock the company out. */
    public PageResponse<UserSummaryRow> listUsers(PageQuery page, String sort, String q) {
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<AppUser> query = users.search(q, s, CurrentUser.id().orElse(null));
        long total = query.count();
        List<UserSummaryRow> items = query.page(page.index(), page.size())
                .list().stream().map(UserSummaryRow::from).toList();
        return PageResponse.of(items, page, total);
    }

    public UserResponse getUser(UUID id) {
        AppUser u = require(id);
        return UserResponse.from(u, matrixFor(id));
    }

    /**
     * Adds a user and their Supabase login. The Supabase id becomes app_users.id.
     * No password is set; they use "Forgot password" to choose their own.
     */
    @Transactional
    public UserResponse createUser(UserRequest body) {
        String email = body.email().trim().toLowerCase();
        users.findByEmail(email).ifPresent(x -> {
            throw ApiException.conflict("A user with that email already exists.");
        });

        UUID authId = supabase.createAuthUser(email);
        try {
            // Supabase's handle_new_user trigger may already have inserted this
            // row; adopt it rather than duplicating. Absent locally and in CI.
            AppUser u = users.findById(authId);
            boolean isNew = u == null;
            if (isNew) {
                u = new AppUser();
                u.id = authId;
            }
            if (u.employeeNo == null || u.employeeNo.isBlank()) {
                u.employeeNo = users.nextEmployeeNo();
            }
            applyProfile(u, body);
            // Persist after the fields are set, or the INSERT has a null email.
            if (isNew) {
                users.persist(u);
            }
            if (body.grants() != null) {
                applyMatrix(u.id, body.grants());
            }
            users.getEntityManager().flush();
            return UserResponse.from(u, matrixFor(u.id));
        } catch (RuntimeException e) {
            // The database work is rolling back; undo the Supabase side too, or
            // the orphan login's email blocks a retry.
            supabase.deleteAuthUser(authId);
            throw e;
        }
    }

    @Transactional
    public UserResponse updateUser(UUID id, UserRequest body) {
        AppUser u = require(id);
        String email = body.email().trim().toLowerCase();
        users.findByEmail(email)
                .filter(x -> !x.id.equals(id))
                .ifPresent(x -> {
                    throw ApiException.conflict("A user with that email already exists.");
                });
        applyProfile(u, body);
        if (body.grants() != null) {
            applyMatrix(id, body.grants());
        }
        users.getEntityManager().flush();
        return UserResponse.from(u, matrixFor(id));
    }

    @Transactional
    public UserResponse setDisabled(UUID id, boolean disabled) {
        AppUser u = require(id);
        u.disabledAt = disabled ? (u.disabledAt != null ? u.disabledAt : OffsetDateTime.now()) : null;
        return UserResponse.from(u, matrixFor(id));
    }

    /**
     * Removes the profile and the login together. Supabase first: its cascade
     * clears app_users, and stopping there on error beats orphaning a login.
     * The explicit deletes are what run locally and in CI, where auth.users
     * does not exist.
     */
    @Transactional
    public void deleteUser(UUID id) {
        require(id);
        supabase.deleteAuthUser(id);
        userModules.delete("userId", id);
        users.delete("id", id);
    }

    // --- user access matrix ----------------------------------------

    public List<ModuleAccessView> getMatrix(UUID id) {
        require(id);
        return matrixFor(id);
    }

    @Transactional
    public List<ModuleAccessView> setMatrix(UUID id, Map<String, AccessLevel> grants) {
        require(id);
        applyMatrix(id, grants);
        users.getEntityManager().flush();
        return matrixFor(id);
    }

    // --- per-profile module gates --------------------------------

    public List<ModuleGateView> getProfileGates(long profileId) {
        requireProfile(profileId);
        Map<String, Boolean> enabled = new LinkedHashMap<>();
        profileModules.forProfile(profileId).forEach(pm -> enabled.put(pm.moduleKey, pm.enabled));
        return modules.allOrdered().stream()
                .map(m -> new ModuleGateView(m.key, m.name, enabled.getOrDefault(m.key, false)))
                .toList();
    }

    @Transactional
    public List<ModuleGateView> setProfileGates(long profileId, Map<String, Boolean> gates) {
        requireProfile(profileId);
        gates.forEach((key, on) -> {
            Module m = modules.findById(key);
            if (m == null) {
                throw ApiException.invalidField("gates", "Unknown module: " + key);
            }
            var pmKey = new CorporateProfileModule.Key(profileId, key);
            CorporateProfileModule pm = profileModules.findById(pmKey);
            boolean want = Boolean.TRUE.equals(on);
            if (pm == null && want) {
                pm = new CorporateProfileModule();
                pm.corporateProfileId = profileId;
                pm.moduleKey = key;
                pm.enabled = true;
                profileModules.persist(pm);
            } else if (pm != null) {
                pm.enabled = want;
            }
        });
        users.getEntityManager().flush();
        return getProfileGates(profileId);
    }

    // --- helpers -------------------------------------------------------

    private AppUser require(UUID id) {
        AppUser u = users.findById(id);
        if (u == null) {
            throw ApiException.notFound("User");
        }
        return u;
    }

    private void requireProfile(long profileId) {
        if (profiles.findById(profileId) == null) {
            throw ApiException.notFound("Corporate profile");
        }
    }

    private void applyProfile(AppUser u, UserRequest b) {
        u.firstName = b.firstName().trim();
        u.lastName = b.lastName().trim();
        u.email = b.email().trim().toLowerCase();
        u.phone = b.phone();
        u.role = b.role() != null ? b.role() : UserRole.USER;
    }

    private void applyMatrix(UUID userId, Map<String, AccessLevel> grants) {
        grants.forEach((key, level) -> {
            Module m = modules.findById(key);
            if (m == null) {
                throw ApiException.invalidField("grants", "Unknown module: " + key);
            }
            var umKey = new UserModule.Key(userId, key);
            UserModule um = userModules.findById(umKey);
            if (level == null || level == AccessLevel.NO_ACCESS) {
                if (um != null) {
                    userModules.delete(um);
                }
            } else if (um == null) {
                um = new UserModule();
                um.userId = userId;
                um.moduleKey = key;
                um.access = level;
                userModules.persist(um);
            } else {
                um.access = level;
            }
        });
    }

    private List<ModuleAccessView> matrixFor(UUID userId) {
        Map<String, AccessLevel> granted = new LinkedHashMap<>();
        userModules.forUser(userId).forEach(um -> granted.put(um.moduleKey, um.access));
        return modules.allOrdered().stream()
                .map(m -> new ModuleAccessView(m.key, m.name, granted.getOrDefault(m.key, AccessLevel.NO_ACCESS)))
                .toList();
    }
}
