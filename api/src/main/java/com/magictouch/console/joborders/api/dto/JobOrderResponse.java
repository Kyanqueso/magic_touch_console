package com.magictouch.console.joborders.api.dto;

import com.magictouch.console.joborders.data.JobOrder;
import com.magictouch.console.joborders.data.JobOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record JobOrderResponse(
        Long id,
        Long corporateProfileId,
        Long customerId,
        String customerName,
        JobOrderStatus status,
        String branch,
        String seriesFrom,
        String seriesTo,
        String jobDescription,
        String specification,
        String equipment,
        LocalDate dateOrdered,
        LocalDate deliveryDate,
        String customerPoRef,
        String atpNo,
        LocalDate atpDate,
        String invoiceNo,
        LocalDate invoiceDate,
        String orNo,
        LocalDate orDate,
        Integer qty,
        String unit,
        String size,
        BigDecimal unitPrice,
        String operator,
        String collator,
        String otherInstructions,
        List<JobOrderMaterialResponse> materials,
        boolean archived,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static JobOrderResponse from(JobOrder j) {
        return new JobOrderResponse(
                j.id, j.corporateProfileId, j.customer.id, j.customer.name, j.status,
                j.branch, j.seriesFrom, j.seriesTo, j.jobDescription, j.specification, j.equipment,
                j.dateOrdered, j.deliveryDate, j.customerPoRef,
                j.atpNo, j.atpDate, j.invoiceNo, j.invoiceDate, j.orNo, j.orDate,
                j.qty, j.unit, j.size, j.unitPrice, j.operator, j.collator, j.otherInstructions,
                j.materials.stream().map(JobOrderMaterialResponse::from).toList(),
                j.isArchived(), j.createdAt, j.updatedAt);
    }
}
