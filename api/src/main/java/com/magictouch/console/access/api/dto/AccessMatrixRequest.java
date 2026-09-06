package com.magictouch.console.access.api.dto;

import com.magictouch.console.access.data.AccessLevel;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

/** {moduleKey -&gt; level}. Levels of NO_ACCESS clear the row. Unlisted modules are untouched. */
public record AccessMatrixRequest(@NotNull Map<String, AccessLevel> grants) {
}
