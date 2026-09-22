package com.magictouch.console.joborders.api.dto;

import java.util.List;

/** A company name grouping one or more customer records (its branches) visible to this profile. */
public record CompanyOption(String name, List<BranchOption> branches) {
}
