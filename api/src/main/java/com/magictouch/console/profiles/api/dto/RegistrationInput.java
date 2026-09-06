package com.magictouch.console.profiles.api.dto;

import com.magictouch.console.profiles.data.RegistrationBody;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** One DTI / SEC / CDA registration in a corporate-profile write. */
public record RegistrationInput(
        @NotNull RegistrationBody body,
        @NotBlank @Size(max = 40) String registrationNo,
        LocalDate registeredAt,
        LocalDate expiresAt
) {
}
