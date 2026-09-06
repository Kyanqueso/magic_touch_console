package com.magictouch.console;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

/** Asserts authentication is enforced, not merely configured. */
@QuarkusTest
class AuthEnforcementTest {

    @jakarta.inject.Inject
    TestUsers testUsers;

    /** Clear the shared spec so given() here is genuinely anonymous. */
    @BeforeEach
    void anonymous() {
        RestAssured.requestSpecification = null;
    }

    // --- no token ------------------------------------------------------

    @Test
    void anonymousIsRejected() {
        given().when().get("/api/v1/modules").then().statusCode(401);
    }

    @Test
    void anonymousWriteIsRejected() {
        given().contentType("application/json")
                .body("{ \"name\": \"Should Not Be Created\" }")
                .when().post("/api/v1/profiles")
                .then().statusCode(401);
    }

    @Test
    void anonymousDeleteIsRejected() {
        // The most destructive endpoint: it cascades to everything under the profile.
        given().when().delete("/api/v1/profiles/1").then().statusCode(401);
    }

    @Test
    void everyApiModuleRejectsAnonymous() {
        String[] paths = {
                "/api/v1/modules",
                "/api/v1/users",
                "/api/v1/profiles",
                "/api/v1/accounts",
                "/api/v1/account-categories",
                "/api/v1/materials",
                "/api/v1/material-groups",
                "/api/v1/customers",
                "/api/v1/suppliers",
                "/api/v1/profiles/1/customers",
                "/api/v1/profiles/1/suppliers",
                "/api/v1/profiles/1/job-orders",
                "/api/v1/profiles/1/suppliers/1/purchase-orders",
                "/api/v1/profiles/1/suppliers/1/sales-invoices",
                "/api/v1/profiles/1/suppliers/1/vouchers",
        };
        for (String path : paths) {
            given().when().get(path)
                    .then().statusCode(401);
        }
    }

    // --- bad tokens ----------------------------------------------------

    @Test
    void malformedTokenIsRejected() {
        given().header("Authorization", "Bearer not-a-jwt")
                .when().get("/api/v1/modules").then().statusCode(401);
    }

    @Test
    void expiredTokenIsRejected() {
        given().header("Authorization", "Bearer " + TestTokens.expired())
                .when().get("/api/v1/modules").then().statusCode(401);
    }

    @Test
    void tokenSignedWithTheWrongSecretIsRejected() {
        given().header("Authorization", "Bearer " + TestTokens.wrongSignature())
                .when().get("/api/v1/modules").then().statusCode(401);
    }

    @Test
    void tokenFromTheWrongIssuerIsRejected() {
        given().header("Authorization", "Bearer " + TestTokens.wrongIssuer())
                .when().get("/api/v1/modules").then().statusCode(401);
    }

    // --- good token ----------------------------------------------------

    @Test
    void validTokenIsAccepted() {
        // Must be a token for a user that actually exists: authorization
        // rejects a validly signed token whose subject has no app_users row.
        given().header("Authorization", TestTokens.bearer(testUsers.ensureAdmin()))
                .when().get("/api/v1/modules")
                .then().statusCode(200)
                .body("size()", is(6));
    }

    // --- CORS preflight -------------------------------------------------

    /**
     * A preflight carries no Authorization header. If the auth policy answers
     * it with 401 the response has no Access-Control-Allow-Origin, and the
     * browser blocks the real request that would have followed.
     */
    @Test
    void corsPreflightIsNotBlockedByAuth() {
        given().header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "GET")
                .when().options("/api/v1/modules")
                .then().statusCode(200)
                .header("access-control-allow-origin", "http://localhost:5173");
    }

    // --- health stays open for the platform probe ----------------------

    @Test
    void healthChecksStayPublic() {
        given().when().get("/q/health/ready").then().statusCode(200);
        given().when().get("/q/health/live").then().statusCode(200);
    }
}
