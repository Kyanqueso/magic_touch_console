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
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.common.page.SortSpec;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class ChartOfAccountsService {

    private static final Map<String, String> SORTABLE = Map.of("code", "code", "name", "name");
    private static final Sort DEFAULT_SORT = Sort.by("code", Sort.Direction.Ascending);

    private final AccountRepository accounts;
    private final AccountCategoryRepository categories;

    public ChartOfAccountsService(AccountRepository accounts, AccountCategoryRepository categories) {
        this.accounts = accounts;
        this.categories = categories;
    }

    // --- categories -------------------------------------------------------

    public List<AccountCategoryResponse> listCategories() {
        return categories.listAll(Sort.by("sortOrder").and("name")).stream()
                .map(AccountCategoryResponse::from).toList();
    }

    @Transactional
    public AccountCategoryResponse createCategory(AccountCategoryRequest body) {
        String name = body.name().trim();
        categories.findByName(name).ifPresent(c -> {
            throw ApiException.conflict("Category \"" + name + "\" already exists.");
        });
        AccountCategory c = new AccountCategory();
        c.name = name;
        c.sortOrder = 0;
        categories.persist(c);
        return AccountCategoryResponse.from(c);
    }

    // --- accounts -------------------------------------------------------

    public PageResponse<AccountResponse> list(PageQuery page, String sort, String q,
                                              boolean archived, Long categoryId) {
        Sort s = SortSpec.parse(sort, SORTABLE, DEFAULT_SORT);
        PanacheQuery<Account> query = accounts.search(archived, q, categoryId, s);
        long total = query.count();
        List<AccountResponse> items = query.page(page.index(), page.size())
                .list().stream().map(AccountResponse::from).toList();
        return PageResponse.of(items, page, total);
    }

    public AccountResponse get(long id) {
        return AccountResponse.from(require(id));
    }

    @Transactional
    public AccountResponse create(AccountRequest body) {
        Account a = new Account();
        apply(a, body, null);
        accounts.persist(a);
        return AccountResponse.from(a);
    }

    @Transactional
    public AccountResponse update(long id, AccountRequest body) {
        Account a = require(id);
        apply(a, body, a.id);
        return AccountResponse.from(a);
    }

    @Transactional
    public void archive(long id) {
        Account a = require(id);
        if (a.archivedAt == null) {
            a.archivedAt = OffsetDateTime.now();
        }
    }

    @Transactional
    public void restore(long id) {
        require(id).archivedAt = null;
    }

    @Transactional
    public void delete(long id) {
        Account a = require(id);
        if (a.archivedAt == null) {
            throw ApiException.conflict("Archive the account before deleting it.");
        }
        accounts.delete(a);
    }

    private Account require(long id) {
        Account a = accounts.findById(id);
        if (a == null) {
            throw ApiException.notFound("Account");
        }
        return a;
    }

    private void apply(Account a, AccountRequest b, Long selfId) {
        String code = b.code().trim();
        Account clash = accounts.findByCode(code);
        if (clash != null && !clash.id.equals(selfId)) {
            throw ApiException.conflict("Account code " + code + " is already in use.");
        }
        a.category = resolveCategory(b.category());
        a.accountClass = b.accountClass();
        a.subType = b.subType();
        a.code = code;
        a.name = b.name().trim();
        a.atcCode = b.atcCode();
        a.taxRate = b.taxRate();
        a.referenceForm = b.referenceForm();
    }

    private AccountCategory resolveCategory(String name) {
        String trimmed = name.trim();
        return categories.findByName(trimmed).orElseGet(() -> {
            AccountCategory c = new AccountCategory();
            c.name = trimmed;
            c.sortOrder = 0;
            categories.persist(c);
            return c;
        });
    }
}
