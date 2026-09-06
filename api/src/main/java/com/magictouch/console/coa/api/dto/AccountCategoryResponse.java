package com.magictouch.console.coa.api.dto;

import com.magictouch.console.coa.data.AccountCategory;

public record AccountCategoryResponse(Long id, String name, int sortOrder) {

    public static AccountCategoryResponse from(AccountCategory c) {
        return new AccountCategoryResponse(c.id, c.name, c.sortOrder);
    }
}
