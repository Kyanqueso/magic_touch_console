package com.magictouch.console.coa.data;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Locale;
import java.util.Optional;

@ApplicationScoped
public class AccountCategoryRepository implements PanacheRepository<AccountCategory> {

    public Optional<AccountCategory> findByName(String name) {
        return find("lower(name) = ?1", name.trim().toLowerCase(Locale.ROOT)).firstResultOptional();
    }
}
