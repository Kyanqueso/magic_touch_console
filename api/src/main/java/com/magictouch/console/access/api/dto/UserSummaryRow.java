package com.magictouch.console.access.api.dto;

import com.magictouch.console.access.data.AppUser;
import com.magictouch.console.access.data.UserRole;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserSummaryRow(
        UUID id,
        String employeeNo,
        String firstName,
        String lastName,
        String email,
        String phone,
        UserRole role,
        boolean disabled,
        OffsetDateTime createdAt
) {

    public static UserSummaryRow from(AppUser u) {
        return new UserSummaryRow(u.id, u.employeeNo, u.firstName, u.lastName, u.email, u.phone,
                u.role, u.isDisabled(), u.createdAt);
    }
}
