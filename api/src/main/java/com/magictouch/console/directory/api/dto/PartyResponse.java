package com.magictouch.console.directory.api.dto;

import com.magictouch.console.common.model.Scope;
import com.magictouch.console.directory.data.CompanyType;
import com.magictouch.console.directory.data.Party;
import com.magictouch.console.directory.data.TaxType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PartyResponse(
        Long id,
        Long corporateProfileId,
        Scope scope,
        String name,
        String address,
        String zipCode,
        int termsDays,
        String tin,
        String branchCode,
        CompanyType companyType,
        TaxType taxType,
        String wtaxAtc1,
        BigDecimal wtaxAtc1Rate,
        String wtaxAtc2,
        BigDecimal wtaxAtc2Rate,
        boolean archived,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static PartyResponse from(Party p) {
        return new PartyResponse(
                p.id, p.corporateProfileId, p.scope, p.name, p.address, p.zipCode, p.termsDays,
                p.tin, p.branchCode, p.companyType, p.taxType,
                p.wtaxAtc1, p.wtaxAtc1Rate, p.wtaxAtc2, p.wtaxAtc2Rate,
                p.isArchived(), p.createdAt, p.updatedAt);
    }
}
