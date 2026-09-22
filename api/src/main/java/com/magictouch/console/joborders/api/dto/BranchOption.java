package com.magictouch.console.joborders.api.dto;

/** One customer row under a {@link CompanyOption} grouping — its branch code resolves to a specific customer id. */
public record BranchOption(long customerId, String branchCode) {
}
