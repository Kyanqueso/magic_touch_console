package com.magictouch.console.directory.api.dto;

import com.magictouch.console.common.model.Scope;
import jakarta.validation.constraints.NotNull;

/** The new linked party's own scope — chosen independently of the original's; the UI defaults it to Global. */
public record LinkPartyRequest(@NotNull Scope scope) {
}
