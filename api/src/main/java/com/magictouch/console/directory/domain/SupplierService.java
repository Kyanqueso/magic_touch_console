package com.magictouch.console.directory.domain;

import com.magictouch.console.directory.data.PartyRepository;
import com.magictouch.console.directory.data.Supplier;
import com.magictouch.console.directory.data.SupplierRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SupplierService extends PartyService<Supplier> {

    private final SupplierRepository repo;

    public SupplierService(SupplierRepository repo) {
        this.repo = repo;
    }

    @Override
    protected PartyRepository<Supplier> repo() {
        return repo;
    }

    @Override
    protected Supplier newEntity() {
        return new Supplier();
    }

    @Override
    protected String noun() {
        return "supplier";
    }
}
