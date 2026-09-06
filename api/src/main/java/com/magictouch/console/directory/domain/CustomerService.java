package com.magictouch.console.directory.domain;

import com.magictouch.console.directory.data.Customer;
import com.magictouch.console.directory.data.CustomerRepository;
import com.magictouch.console.directory.data.PartyRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class CustomerService extends PartyService<Customer> {

    private final CustomerRepository repo;

    public CustomerService(CustomerRepository repo) {
        this.repo = repo;
    }

    @Override
    protected PartyRepository<Customer> repo() {
        return repo;
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
