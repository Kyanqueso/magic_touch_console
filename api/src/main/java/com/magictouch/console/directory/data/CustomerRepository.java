package com.magictouch.console.directory.data;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class CustomerRepository extends PartyRepository<Customer> {

    @Override
    protected String entityName() {
        return "Customer";
    }
}
