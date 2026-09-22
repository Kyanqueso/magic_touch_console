package com.magictouch.console.directory.domain;

import com.magictouch.console.common.error.ApiException;
import com.magictouch.console.common.model.Scope;
import com.magictouch.console.common.security.CurrentUser;
import com.magictouch.console.directory.api.dto.PartyRequest;
import com.magictouch.console.directory.api.dto.PartyResponse;
import com.magictouch.console.directory.data.Customer;
import com.magictouch.console.directory.data.CustomerRepository;
import com.magictouch.console.directory.data.Party;
import com.magictouch.console.directory.data.PartyLink;
import com.magictouch.console.directory.data.PartyLinkRepository;
import com.magictouch.console.directory.data.Supplier;
import com.magictouch.console.directory.data.SupplierRepository;
import com.magictouch.console.profiles.domain.ProfileGuard;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.Objects;

/**
 * Links a customer to the supplier created alongside it ("Also add as
 * Supplier"), and carries a later identity edit across to the linked party on
 * request. {@link PartyService}'s customers/suppliers stay two independent
 * tables; this is the one place a customer and a supplier are deliberately
 * tied together.
 */
@ApplicationScoped
public class PartyLinkService {

    private final CustomerRepository customers;
    private final SupplierRepository suppliers;
    private final PartyLinkRepository links;
    private final ProfileGuard profileGuard;

    public PartyLinkService(CustomerRepository customers, SupplierRepository suppliers,
                            PartyLinkRepository links, ProfileGuard profileGuard) {
        this.customers = customers;
        this.suppliers = suppliers;
        this.links = links;
        this.profileGuard = profileGuard;
    }

    public Long linkedSupplierId(long profileId, long customerId) {
        requireCustomer(profileId, customerId);
        return links.findByCustomerId(customerId).map(l -> l.supplierId).orElse(null);
    }

    public Long linkedCustomerId(long profileId, long supplierId) {
        requireSupplier(profileId, supplierId);
        return links.findBySupplierId(supplierId).map(l -> l.customerId).orElse(null);
    }

    /**
     * Creates a supplier from the customer's own identity fields. The
     * supplier's scope is an explicit, independent choice — a company can
     * reasonably be a Global customer but a Local-only supplier, or the
     * reverse — so it is never inherited from the customer's own scope.
     * Commercial terms (terms days, WTAX ATC 1/2 + rates) are left at their
     * defaults, never copied: the two sides can carry different terms with
     * the same company.
     */
    @Transactional
    public PartyResponse createLinkedSupplier(long profileId, long customerId, Scope supplierScope) {
        Customer c = requireCustomer(profileId, customerId);
        links.findByCustomerId(customerId).ifPresent(l -> {
            throw ApiException.conflict("This customer is already linked to a supplier.");
        });

        Supplier s = new Supplier();
        s.scope = supplierScope;
        s.corporateProfileId = supplierScope == Scope.LOCAL ? profileId : null;
        copyIdentity(c, s);
        suppliers.persist(s);

        PartyLink link = new PartyLink();
        link.customerId = customerId;
        link.supplierId = s.id;
        link.createdBy = CurrentUser.id().orElse(null);
        links.persist(link);

        return PartyResponse.from(s);
    }

    /**
     * Mirror of {@link #createLinkedSupplier} — creates a customer from the
     * supplier's own identity fields, with the same independent-scope and
     * defaults-only-commercial-terms rules.
     */
    @Transactional
    public PartyResponse createLinkedCustomer(long profileId, long supplierId, Scope customerScope) {
        Supplier s = requireSupplier(profileId, supplierId);
        links.findBySupplierId(supplierId).ifPresent(l -> {
            throw ApiException.conflict("This supplier is already linked to a customer.");
        });

        Customer c = new Customer();
        c.scope = customerScope;
        c.corporateProfileId = customerScope == Scope.LOCAL ? profileId : null;
        copyIdentity(s, c);
        customers.persist(c);

        PartyLink link = new PartyLink();
        link.customerId = c.id;
        link.supplierId = supplierId;
        link.createdBy = CurrentUser.id().orElse(null);
        links.persist(link);

        return PartyResponse.from(c);
    }

    @Transactional
    public void syncIdentityToSupplier(long profileId, long customerId, PartyRequest body) {
        requireCustomer(profileId, customerId);
        links.findByCustomerId(customerId).ifPresent(link -> {
            Supplier s = suppliers.findById(link.supplierId);
            if (s != null) {
                applyIdentity(s, body);
            }
        });
    }

    @Transactional
    public void syncIdentityToCustomer(long profileId, long supplierId, PartyRequest body) {
        requireSupplier(profileId, supplierId);
        links.findBySupplierId(supplierId).ifPresent(link -> {
            Customer c = customers.findById(link.customerId);
            if (c != null) {
                applyIdentity(c, body);
            }
        });
    }

    // Identity/registration fields only — never the commercial terms.
    private void copyIdentity(Party from, Party to) {
        to.name = from.name;
        to.address = from.address;
        to.tin = from.tin;
        to.branchCode = from.branchCode;
        to.companyType = from.companyType;
        to.taxType = from.taxType;
    }

    private void applyIdentity(Party p, PartyRequest body) {
        p.name = body.name().trim();
        p.address = body.address();
        p.tin = body.tin();
        p.branchCode = body.branchCode();
        p.companyType = body.companyType();
        p.taxType = body.taxType();
    }

    private Customer requireCustomer(long profileId, long id) {
        profileGuard.require(profileId);
        Customer c = customers.findById(id);
        if (c == null || !visible(c, profileId)) {
            throw ApiException.notFound("Customer");
        }
        return c;
    }

    private Supplier requireSupplier(long profileId, long id) {
        profileGuard.require(profileId);
        Supplier s = suppliers.findById(id);
        if (s == null || !visible(s, profileId)) {
            throw ApiException.notFound("Supplier");
        }
        return s;
    }

    private boolean visible(Party p, long profileId) {
        return p.scope == Scope.GLOBAL || Objects.equals(p.corporateProfileId, profileId);
    }
}
