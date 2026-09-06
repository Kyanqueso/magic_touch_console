package com.magictouch.console.profiles.api.dto;

import com.magictouch.console.profiles.data.BusinessRegistration;
import com.magictouch.console.profiles.data.RegistrationBody;

import java.time.LocalDate;

public record RegistrationView(
        Long id,
        RegistrationBody body,
        String registrationNo,
        LocalDate registeredAt,
        LocalDate expiresAt,
        boolean active
) {

    public static RegistrationView from(BusinessRegistration r) {
        return new RegistrationView(r.id, r.body, r.registrationNo, r.registeredAt, r.expiresAt, r.isActive());
    }
}
