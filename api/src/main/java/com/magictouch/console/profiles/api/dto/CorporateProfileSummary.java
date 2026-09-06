package com.magictouch.console.profiles.api.dto;

import com.magictouch.console.profiles.data.CorporateProfile;

import java.time.OffsetDateTime;

/** List-row shape — no registrations / filing types, to keep the list query flat. */
public record CorporateProfileSummary(
        Long id,
        String name,
        String status,
        boolean archived,
        OffsetDateTime createdAt
) {

    public static CorporateProfileSummary from(CorporateProfile p) {
        return new CorporateProfileSummary(p.id, p.name, p.status(), p.isArchived(), p.createdAt);
    }
}
