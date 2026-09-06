package com.magictouch.console.access.data;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class CorporateProfileModuleRepository
        implements PanacheRepositoryBase<CorporateProfileModule, CorporateProfileModule.Key> {

    public List<CorporateProfileModule> forProfile(long profileId) {
        return list("corporateProfileId", profileId);
    }
}
