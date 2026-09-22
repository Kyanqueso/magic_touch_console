package com.magictouch.console.coa.domain;

import com.magictouch.console.coa.api.dto.AccountCategoryRequest;
import com.magictouch.console.coa.api.dto.AccountCategoryResponse;
import com.magictouch.console.coa.api.dto.AccountRequest;
import com.magictouch.console.coa.api.dto.AccountResponse;
import com.magictouch.console.coa.data.Account;
import com.magictouch.console.coa.data.AccountCategory;
import com.magictouch.console.coa.data.AccountCategoryRepository;
import com.magictouch.console.coa.data.AccountRepository;
import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.model.Scope;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import com.magictouch.console.profiles.domain.ProfileGuard;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@ApplicationScoped
public class ChartOfAccountsService {

    private static final Map<String, String> SORTABLE = Map.of("code", "code", "name", "name");
    private static final Sort DEFAULT_SORT = Sort.by("code", Sort.Direction.Ascending);

    private final AccountRepository accounts;
    private final AccountCategoryRepository categories;
    private final ProfileGuard profileGuard;

    public ChartOfAccountsService(AccountRepository accounts, AccountCategoryRepository categories,
                                  ProfileGuard profileGuard) {
        this.accounts = accounts;
        this.categories = categories;
        this.profileGuard = profileGuard;
    }

    // --- categories -------------------------------------------------------

    public List<AccountCategoryResponse> listCategories(long profileId) {
        profileGuard.require(profileId);
        return categories.findVisible(profileId, Sort.by("sortOrder").and("name")).stream()
                .map(AccountCategoryResponse::from).toList();
    }

    public List<AccountCategoryResponse> listCategoriesGlobal() {
        return categories.findGlobal(Sort.by("sortOrder").and("name")).stream()
                .map(AccountCategoryResponse::from).toList();
    }

    @Transactional
    public AccountCategoryResponse createCategory(long profileId, AccountCategoryRequest body) {
        profileGuard.require(profileId);
        Long ownerProfileId = body.scope() == Scope.LOCAL ? profileId : null;
        return AccountCategoryResponse.from(createCategoryChecked(ownerProfileId, body.scope(), body.name()));
    }

    @Transactional
    public AccountCategoryResponse createCategoryGlobal(AccountCategoryRequest body) {
        return AccountCategoryResponse.from(createCategoryChecked(null, Scope.GLOBAL, body.name()));
    }

    // Explicit creation rejects a name clash; resolveCategory() below reuses it instead.
    private AccountCategory createCategoryChecked(Long profileId, Scope scope, String name) {
        String trimmed = name.trim();
        categories.findByName(profileId, trimmed).ifPresent(c -> {
            throw ApiException.conflict("Category \"" + trimmed + "\" already exists.");
        });
        return newCategory(profileId, scope, trimmed);
    }

    private AccountCategory newCategory(Long profileId, Scope scope, String name) {
        AccountCategory c = new AccountCategory();
        c.name = name;
        c.sortOrder = 0;
        c.scope = scope;
        c.corporateProfileId = profileId;
        categories.persist(c);
        return c;
    }

    // --- accounts -------------------------------------------------------

    public PageResponse<AccountResponse> list(long profileId, PageQuery page, String sort, String q,
                                              Scope scopeFilter, boolean archived, Long categoryId) {
        profileGuard.require(profileId);
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<Account> query = accounts.findVisible(profileId, archived, scopeFilter, q, categoryId, s);
        long total = query.count();
        List<AccountResponse> items = query.page(page.index(), page.size())
                .list().stream().map(AccountResponse::from).toList();
        return PageResponse.of(items, page, total);
    }

    public PageResponse<AccountResponse> listGlobal(PageQuery page, String sort, String q,
                                                    boolean archived, Long categoryId) {
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<Account> query = accounts.findGlobal(archived, q, categoryId, s);
        long total = query.count();
        List<AccountResponse> items = query.page(page.index(), page.size())
                .list().stream().map(AccountResponse::from).toList();
        return PageResponse.of(items, page, total);
    }

    public AccountResponse get(long profileId, long id) {
        return AccountResponse.from(require(profileId, id));
    }

    public AccountResponse getGlobal(long id) {
        return AccountResponse.from(requireGlobal(id));
    }

    @Transactional
    public AccountResponse create(long profileId, AccountRequest body) {
        profileGuard.require(profileId);
        Account a = new Account();
        apply(a, body, profileId, null);
        accounts.persist(a);
        return AccountResponse.from(a);
    }

    @Transactional
    public AccountResponse createGlobal(AccountRequest body) {
        Account a = new Account();
        applyGlobal(a, body, null);
        accounts.persist(a);
        return AccountResponse.from(a);
    }

    @Transactional
    public AccountResponse update(long profileId, long id, AccountRequest body) {
        Account a = require(profileId, id);
        apply(a, body, profileId, a.id);
        return AccountResponse.from(a);
    }

    @Transactional
    public AccountResponse updateGlobal(long id, AccountRequest body) {
        Account a = requireGlobal(id);
        applyGlobal(a, body, a.id);
        return AccountResponse.from(a);
    }

    @Transactional
    public void archive(long profileId, long id) {
        archiveEntity(require(profileId, id));
    }

    @Transactional
    public void archiveGlobal(long id) {
        archiveEntity(requireGlobal(id));
    }

    @Transactional
    public void restore(long profileId, long id) {
        require(profileId, id).archivedAt = null;
    }

    @Transactional
    public void restoreGlobal(long id) {
        requireGlobal(id).archivedAt = null;
    }

    @Transactional
    public void delete(long profileId, long id) {
        deleteEntity(require(profileId, id));
    }

    @Transactional
    public void deleteGlobal(long id) {
        deleteEntity(requireGlobal(id));
    }

    private void archiveEntity(Account a) {
        if (a.archivedAt == null) {
            a.archivedAt = OffsetDateTime.now();
        }
    }

    private void deleteEntity(Account a) {
        if (a.archivedAt == null) {
            throw ApiException.conflict("Archive the account before deleting it.");
        }
        accounts.delete(a);
    }

    private Account require(long profileId, long id) {
        profileGuard.require(profileId);
        Account a = accounts.findById(id);
        if (a == null || !visible(a, profileId)) {
            throw ApiException.notFound("Account");
        }
        return a;
    }

    private Account requireGlobal(long id) {
        Account a = accounts.findById(id);
        if (a == null || a.scope != Scope.GLOBAL) {
            throw ApiException.notFound("Account");
        }
        return a;
    }

    private boolean visible(Account a, long profileId) {
        return a.scope == Scope.GLOBAL || Objects.equals(a.corporateProfileId, profileId);
    }

    private void apply(Account a, AccountRequest b, long profileId, Long selfId) {
        a.scope = b.scope();
        a.corporateProfileId = b.scope() == Scope.LOCAL ? profileId : null;
        applyFields(a, b, selfId);
    }

    private void applyGlobal(Account a, AccountRequest b, Long selfId) {
        a.scope = Scope.GLOBAL;
        a.corporateProfileId = null;
        applyFields(a, b, selfId);
    }

    private void applyFields(Account a, AccountRequest b, Long selfId) {
        String code = b.code().trim();
        if (accounts.codeTakenByAnother(a.corporateProfileId, code, selfId)) {
            throw ApiException.conflict("Account code " + code + " is already in use.");
        }
        a.category = resolveCategory(a.corporateProfileId, b.category());
        a.accountClass = b.accountClass();
        a.subType = b.subType();
        a.code = code;
        a.name = b.name().trim();
        a.atcCode = b.atcCode();
        a.taxRate = b.taxRate();
        a.referenceForm = b.referenceForm();
    }

    // Only matches categories visible to scopeProfileId, so an account never
    // silently picks up another profile's Local category by name.
    private AccountCategory resolveCategory(Long scopeProfileId, String name) {
        String trimmed = name.trim();
        return categories.findByName(scopeProfileId, trimmed)
                .orElseGet(() -> newCategory(scopeProfileId,
                        scopeProfileId == null ? Scope.GLOBAL : Scope.LOCAL, trimmed));
    }
}
