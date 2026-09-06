package com.magictouch.console.coa.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AccountCategoryRequest(@NotBlank @Size(max = 120) String name) {
}
