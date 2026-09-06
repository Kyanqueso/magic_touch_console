package com.magictouch.console.access.api.dto;

import com.magictouch.console.access.data.AccessLevel;
import com.magictouch.console.access.data.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record UserRequest(
        @NotBlank @Size(max = 50) String firstName,
        @NotBlank @Size(max = 50) String lastName,
        @NotBlank @Email @Size(max = 255) String email,
        @Size(max = 20) String phone,
        UserRole role,
        /** Optional — set the module access matrix in the same call. */
        Map<String, AccessLevel> grants
) {
}
