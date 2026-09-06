package com.magictouch.console.profiles.api.dto;

import com.magictouch.console.profiles.data.CorporateProfile;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record CorporateProfileResponse(
        Long id,
        String name,
        String address,
        String status,
        String tin,
        String sss,
        String phic,
        String hdmf,
        String wtaxAtc1,
        BigDecimal wtaxAtc1Rate,
        String wtaxAtc2,
        BigDecimal wtaxAtc2Rate,
        List<RegistrationView> registrations,
        List<String> filingTypes,
        boolean archived,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static CorporateProfileResponse from(CorporateProfile p) {
        return new CorporateProfileResponse(
                p.id, p.name, p.address, p.status(),
                p.tin, p.sss, p.phic, p.hdmf,
                p.wtaxAtc1, p.wtaxAtc1Rate, p.wtaxAtc2, p.wtaxAtc2Rate,
                p.registrations.stream().map(RegistrationView::from).toList(),
                p.filingTypes.stream().map(f -> f.value).toList(),
                p.isArchived(), p.createdAt, p.updatedAt);
    }
}
