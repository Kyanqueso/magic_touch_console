package com.magictouch.console.coa.api.dto;

import com.magictouch.console.common.model.Scope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AccountCategoryRequest(@NotBlank @Size(max = 120) String name, @NotNull Scope scope) {
}
