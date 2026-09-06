package com.magictouch.console.joborders.api.dto;

import com.magictouch.console.joborders.data.JobOrder;
import com.magictouch.console.joborders.data.JobOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** List-row shape — no material lines. */
public record JobOrderSummaryRow(
        Long id,
        Long customerId,
        String customerName,
        String jobDescription,
        JobOrderStatus status,
        LocalDate dateOrdered,
        LocalDate deliveryDate,
        Integer qty,
        BigDecimal unitPrice,
        boolean archived,
        OffsetDateTime createdAt
) {

    public static JobOrderSummaryRow from(JobOrder j) {
        return new JobOrderSummaryRow(
                j.id, j.customer.id, j.customer.name, j.jobDescription, j.status,
                j.dateOrdered, j.deliveryDate, j.qty, j.unitPrice,
                j.isArchived(), j.createdAt);
    }
}
