package com.magictouch.console.coa.data;

import com.magictouch.console.common.entity.ReferenceGroup;
import com.magictouch.console.common.model.Scope;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "account_categories")
public class AccountCategory extends ReferenceGroup {

    @Column(name = "corporate_profile_id")
    public Long corporateProfileId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 6)
    public Scope scope;
}
