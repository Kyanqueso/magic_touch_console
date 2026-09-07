package com.magictouch.console.directory.data;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SupplierRepository extends PartyRepository<Supplier> {

    @Override
    protected String entityName() {
        return "Supplier";
    }
}
