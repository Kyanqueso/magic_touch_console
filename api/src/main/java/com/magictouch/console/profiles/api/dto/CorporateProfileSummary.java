package com.magictouch.console.profiles.api.dto;

import com.magictouch.console.profiles.data.CorporateProfile;

import java.time.OffsetDateTime;

/** List-row shape — no registrations / filing types, to keep the list query flat. */
public record CorporateProfileSummary(
        Long id,
        String name,
        String status,
        boolean archived,
        OffsetDateTime createdAt,
        // Counts match what the profile's own tabs show: its Local rows plus the
        // shared Global ones. The card shows job orders when that module is on
        // for this profile, and suppliers when it is off.
        boolean jobOrdersEnabled,
        long jobOrderCount,
        long customerCount,
        long supplierCount
) {

    public static CorporateProfileSummary from(CorporateProfile p, boolean jobOrdersEnabled,
                                               long jobOrders, long customers, long suppliers) {
        return new CorporateProfileSummary(
                p.id, p.name, p.status(), p.isArchived(), p.createdAt,
                jobOrdersEnabled, jobOrders, customers, suppliers);
    }
}
