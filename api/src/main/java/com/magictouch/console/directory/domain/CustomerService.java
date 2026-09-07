package com.magictouch.console.directory.domain;

import com.magictouch.console.directory.data.Customer;
import com.magictouch.console.directory.data.CustomerRepository;
import com.magictouch.console.directory.data.PartyRepository;
import com.magictouch.console.profiles.domain.ProfileGuard;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class CustomerService extends PartyService<Customer> {

    private final CustomerRepository repo;
    private final ProfileGuard profileGuard;

    public CustomerService(CustomerRepository repo, ProfileGuard profileGuard) {
        this.repo = repo;
        this.profileGuard = profileGuard;
    }

    @Override
    protected PartyRepository<Customer> repo() {
        return repo;
    }

    @Override
    protected ProfileGuard profileGuard() {
        return profileGuard;
    }

    @Override
    protected Customer newEntity() {
        return new Customer();
    }

    @Override
    protected String noun() {
        return "customer";
    }
}
