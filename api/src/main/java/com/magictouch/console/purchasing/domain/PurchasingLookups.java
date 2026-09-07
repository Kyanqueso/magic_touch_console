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

    /**
     * A supplier this profile may buy from: its own Local one, or any Global
     * one. Global entries are shared so the same firm need not be re-added to
     * every profile; the document itself still belongs to the buying profile.
     */
    public Supplier requireUsableSupplier(long profileId, long supplierId) {
        Supplier s = suppliers.findById(supplierId);
        boolean usable = s != null
                && (s.scope == Scope.GLOBAL || Objects.equals(s.corporateProfileId, profileId));
        if (!usable) {
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
