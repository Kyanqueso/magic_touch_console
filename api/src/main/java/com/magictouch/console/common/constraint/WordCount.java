package com.magictouch.console.common.constraint;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Caps a free-text field at {@code max} whitespace-separated words. Null / blank passes. */
@Documented
@Constraint(validatedBy = WordCountValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface WordCount {

    int max();

    String message() default "Must be at most {max} words.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
