package com.magictouch.console.directory.api.dto;

import com.magictouch.console.common.model.Scope;
import jakarta.validation.constraints.NotNull;

/** The new supplier's own scope — chosen independently of the customer's; the UI defaults it to Global. */
public record LinkSupplierRequest(@NotNull Scope scope) {
}
