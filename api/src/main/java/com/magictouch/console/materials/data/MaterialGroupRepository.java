package com.magictouch.console.materials.data;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Locale;
import java.util.Optional;

@ApplicationScoped
public class MaterialGroupRepository implements PanacheRepository<MaterialGroup> {

    public Optional<MaterialGroup> findByName(String name) {
        return find("lower(name) = ?1", name.trim().toLowerCase(Locale.ROOT)).firstResultOptional();
    }
}
