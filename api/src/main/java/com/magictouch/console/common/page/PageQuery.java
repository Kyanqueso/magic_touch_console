package com.magictouch.console.common.page;

/** Normalised pagination input. {@code page} is 1-based. */
public record PageQuery(int page, int size) {

    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    public static PageQuery of(Integer page, Integer size) {
        int p = (page == null || page < 1) ? 1 : page;
        int s = (size == null) ? DEFAULT_SIZE : Math.min(Math.max(size, 1), MAX_SIZE);
        return new PageQuery(p, s);
    }

    /** 0-based index, for {@code PanacheQuery.page(index, size)}. */
    public int index() {
        return page - 1;
    }
}
