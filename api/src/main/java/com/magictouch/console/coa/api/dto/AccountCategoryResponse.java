package com.magictouch.console.coa.api.dto;

import com.magictouch.console.coa.data.AccountCategory;
import com.magictouch.console.common.model.Scope;

public record AccountCategoryResponse(Long id, String name, int sortOrder, Long corporateProfileId, Scope scope) {

    public static AccountCategoryResponse from(AccountCategory c) {
        return new AccountCategoryResponse(c.id, c.name, c.sortOrder, c.corporateProfileId, c.scope);
    }
}
