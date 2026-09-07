package com.magictouch.console.profiles.domain;

import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.profiles.data.CorporateProfileRepository;
import jakarta.enterprise.context.ApplicationScoped;

// Shared check so a request under /profiles/{id}/... 404s on a bad id instead of a raw FK 500.
@ApplicationScoped
public class ProfileGuard {

    private final CorporateProfileRepository profiles;

    public ProfileGuard(CorporateProfileRepository profiles) {
        this.profiles = profiles;
    }

    public void require(long profileId) {
        if (profiles.findById(profileId) == null) {
            throw ApiException.notFound("Corporate profile");
        }
    }
}
