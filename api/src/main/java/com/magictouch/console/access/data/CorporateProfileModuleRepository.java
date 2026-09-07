package com.magictouch.console.access.data;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@ApplicationScoped
public class CorporateProfileModuleRepository
        implements PanacheRepositoryBase<CorporateProfileModule, CorporateProfileModule.Key> {

    public List<CorporateProfileModule> forProfile(long profileId) {
        return list("corporateProfileId", profileId);
    }

    /** Which of these profiles have the module switched on. Missing row = off. */
    public Set<Long> enabledFor(Collection<Long> profileIds, String moduleKey) {
        if (profileIds.isEmpty()) {
            return Set.of();
        }
        return find("corporateProfileId in ?1 and moduleKey = ?2 and enabled = true", profileIds, moduleKey)
                .stream().map(m -> m.corporateProfileId).collect(Collectors.toSet());
    }
}
