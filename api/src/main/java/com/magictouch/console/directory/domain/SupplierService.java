package com.magictouch.console.directory.domain;

import com.magictouch.console.directory.data.PartyRepository;
import com.magictouch.console.directory.data.Supplier;
import com.magictouch.console.directory.data.SupplierRepository;
import com.magictouch.console.profiles.domain.ProfileGuard;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SupplierService extends PartyService<Supplier> {

    private final SupplierRepository repo;
    private final ProfileGuard profileGuard;

    public SupplierService(SupplierRepository repo, ProfileGuard profileGuard) {
        this.repo = repo;
        this.profileGuard = profileGuard;
    }

    @Override
    protected PartyRepository<Supplier> repo() {
        return repo;
    }

    @Override
    protected ProfileGuard profileGuard() {
        return profileGuard;
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
