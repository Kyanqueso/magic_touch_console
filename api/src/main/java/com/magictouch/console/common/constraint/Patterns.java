package com.magictouch.console.common.constraint;

/** Server-side mirrors of the frontend input masks. */
public final class Patterns {

    /** {@code 000-000-000-000} */
    public static final String TIN = "^\\d{3}-\\d{3}-\\d{3}-\\d{3}$";
    /** {@code 00-0000000-0} */
    public static final String SSS = "^\\d{2}-\\d{7}-\\d$";
    /** {@code 00-000000000-0} */
    public static final String PHIC = "^\\d{2}-\\d{9}-\\d$";
    /** {@code 0000-0000-0000} */
    public static final String HDMF = "^\\d{4}-\\d{4}-\\d{4}$";
    /** {@code 0917-123-4567} */
    public static final String PHONE = "^\\d{4}-\\d{3}-\\d{4}$";

    private Patterns() {
    }
}
