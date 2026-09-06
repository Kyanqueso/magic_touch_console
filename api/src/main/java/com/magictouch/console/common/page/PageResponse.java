package com.magictouch.console.common.page;

import java.util.List;

/** The one envelope every collection endpoint returns. */
public record PageResponse<T>(List<T> items, int page, int size, long total) {

    public static <T> PageResponse<T> of(List<T> items, PageQuery query, long total) {
        return new PageResponse<>(items, query.page(), query.size(), total);
    }
}
