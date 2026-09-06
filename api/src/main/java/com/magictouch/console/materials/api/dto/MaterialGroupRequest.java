package com.magictouch.console.materials.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MaterialGroupRequest(@NotBlank @Size(max = 120) String name) {
}
