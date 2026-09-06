package com.magictouch.console.access.api.dto;

import com.magictouch.console.access.data.AppUser;
import com.magictouch.console.access.data.UserRole;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String employeeNo,
        String firstName,
        String lastName,
        String email,
        String phone,
        UserRole role,
        boolean disabled,
        List<ModuleAccessView> modules,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static UserResponse from(AppUser u, List<ModuleAccessView> modules) {
        return new UserResponse(u.id, u.employeeNo, u.firstName, u.lastName, u.email, u.phone,
                u.role, u.isDisabled(), modules, u.createdAt, u.updatedAt);
    }
}
