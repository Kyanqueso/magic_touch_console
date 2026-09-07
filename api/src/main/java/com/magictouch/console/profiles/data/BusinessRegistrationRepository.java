package com.magictouch.console.profiles.data;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Locale;

@ApplicationScoped
public class BusinessRegistrationRepository implements PanacheRepository<BusinessRegistration> {

    // True when another profile already holds this agency registration number.
    public boolean numberTakenByAnother(RegistrationBody body, String registrationNo, Long selfProfileId) {
        long self = selfProfileId == null ? -1L : selfProfileId;
        return count("body = ?1 and lower(registrationNo) = ?2 and profile.id <> ?3",
                body, registrationNo.trim().toLowerCase(Locale.ROOT), self) > 0;
    }
}
