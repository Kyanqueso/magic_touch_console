package com.magictouch.console.joborders.api.dto;

import com.magictouch.console.directory.data.Customer;

// Minimal customer row for the job-order customer picker.
public record CustomerOption(long id, String name) {

    public static CustomerOption from(Customer c) {
        return new CustomerOption(c.id, c.name);
    }
}
