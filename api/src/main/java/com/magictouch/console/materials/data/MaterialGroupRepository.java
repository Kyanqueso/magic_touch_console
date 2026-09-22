package com.magictouch.console.materials.data;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Locale;
import java.util.Optional;

@ApplicationScoped
public class MaterialGroupRepository implements PanacheRepository<MaterialGroup> {

    public PanacheQuery<MaterialGroup> forProfile(long profileId, Sort sort) {
        return find("corporateProfileId", sort, profileId);
    }

    public Optional<MaterialGroup> findByName(long profileId, String name) {
        return find("corporateProfileId = ?1 and lower(name) = ?2",
                profileId, name.trim().toLowerCase(Locale.ROOT)).firstResultOptional();
    }
}
