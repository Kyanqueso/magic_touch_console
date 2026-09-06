package com.magictouch.console.coa.api.dto;

import com.magictouch.console.coa.data.Account;
import com.magictouch.console.coa.data.AccountClass;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AccountResponse(
        Long id,
        Long categoryId,
        String categoryName,
        AccountClass accountClass,
        String subType,
        String code,
        String name,
        String atcCode,
        BigDecimal taxRate,
        String referenceForm,
        boolean archived,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static AccountResponse from(Account a) {
        return new AccountResponse(
                a.id, a.category.id, a.category.name,
                a.accountClass, a.subType, a.code, a.name,
                a.atcCode, a.taxRate, a.referenceForm,
                a.isArchived(), a.createdAt, a.updatedAt);
    }
}
