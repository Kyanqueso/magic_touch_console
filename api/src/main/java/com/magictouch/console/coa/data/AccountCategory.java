package com.magictouch.console.coa.data;

import com.magictouch.console.common.entity.ReferenceGroup;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "account_categories")
public class AccountCategory extends ReferenceGroup {
}
