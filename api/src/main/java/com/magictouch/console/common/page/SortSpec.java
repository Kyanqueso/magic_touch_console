package com.magictouch.console.common.page;

import io.quarkus.panache.common.Sort;

import java.util.Map;

/**
 * Parses a {@code sort} query param — {@code "name"} (asc) or {@code "-createdAt"}
 * (desc) — against a whitelist of {apiField -&gt; entityField}. Anything outside
 * the whitelist falls back to the caller's default, so the param can't be used to
 * probe arbitrary columns.
 */
public final class SortSpec {

    private SortSpec() {
    }

    public static Sort parse(String sort, Map<String, String> allowed, Sort fallback) {
        if (sort == null || sort.isBlank()) {
            return fallback;
        }
        boolean desc = sort.startsWith("-");
        String key = desc ? sort.substring(1) : sort;
        String column = allowed.get(key);
        if (column == null) {
            return fallback;
        }
        return Sort.by(column, desc ? Sort.Direction.Descending : Sort.Direction.Ascending);
    }
}
