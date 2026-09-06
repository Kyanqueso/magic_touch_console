package com.magictouch.console.purchasing.domain;

import com.magictouch.console.coa.data.AccountRepository;
import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.model.Scope;
import com.magictouch.console.directory.data.Supplier;
import com.magictouch.console.directory.data.SupplierRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Objects;

/** Cross-module lookups the purchasing services share. */
@ApplicationScoped
public class PurchasingLookups {

    private final SupplierRepository suppliers;
    private final AccountRepository accounts;

    public PurchasingLookups(SupplierRepository suppliers, AccountRepository accounts) {
        this.suppliers = suppliers;
        this.accounts = accounts;
    }

    /** The composite FK requires a Local supplier of the same profile. */
    public Supplier requireLocalSupplier(long profileId, long supplierId) {
        Supplier s = suppliers.findById(supplierId);
        if (s == null || s.scope != Scope.LOCAL || !Objects.equals(s.corporateProfileId, profileId)) {
            throw ApiException.notFound("Supplier");
        }
        return s;
    }

    public void checkAccount(String field, Long id) {
        if (id != null && accounts.findById(id) == null) {
            throw ApiException.invalidField(field, "No such account.");
        }
    }
}
