package com.magictouch.console.directory.data;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class PartyLinkRepository implements PanacheRepositoryBase<PartyLink, Long> {

    public Optional<PartyLink> findByCustomerId(long customerId) {
        return findByIdOptional(customerId);
    }

    public Optional<PartyLink> findBySupplierId(long supplierId) {
        return find("supplierId", supplierId).firstResultOptional();
    }
}
