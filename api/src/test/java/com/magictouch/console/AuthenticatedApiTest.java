package com.magictouch.console;

import io.restassured.RestAssured;
import io.restassured.builder.RequestSpecBuilder;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;

/**
 * Base for the resource tests: every given() carries a valid admin token.
 * These assert business behaviour; enforcement lives in AuthEnforcementTest
 * and AuthorizationTest.
 */
public abstract class AuthenticatedApiTest {

    @Inject
    TestUsers testUsers;

    // A real ADMIN row: tokens whose sub has no app_users row are rejected.
    @BeforeEach
    void sendBearerToken() {
        testUsers.ensureAdmin();
        // Clear first: RequestSpecBuilder seeds from the current spec, so each
        // test would otherwise append another Authorization header until 431.
        RestAssured.requestSpecification = null;
        RestAssured.requestSpecification = new RequestSpecBuilder()
                .addHeader("Authorization", TestTokens.bearer(TestUsers.ADMIN_ID))
                .build();
    }
}
