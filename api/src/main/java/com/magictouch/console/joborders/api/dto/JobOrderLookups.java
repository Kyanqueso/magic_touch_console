package com.magictouch.console.joborders.api.dto;

import com.magictouch.console.materials.api.dto.MaterialOption;

import java.util.List;

// Picker data the Add / Edit job-order screens need, in one call, gated by job_orders.
public record JobOrderLookups(List<CustomerOption> customers, List<MaterialOption> materials) {
}
