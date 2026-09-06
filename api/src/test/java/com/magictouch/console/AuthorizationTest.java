package com.magictouch.console;

import com.magictouch.console.access.data.AccessLevel;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;

/** Asserts the per-module access matrix is enforced. */
@QuarkusTest
class AuthorizationTest {

    @Inject
    TestUsers testUsers;

    @BeforeEach
    void isolate() {
        // Drop the shared admin spec so each case sends only its own token.
        RestAssured.requestSpecification = null;
    }

    private static io.restassured.specification.RequestSpecification as(UUID user) {
        return given().header("Authorization", TestTokens.bearer(user));
    }

    // --- no grant at all -----------------------------------------------

    @Test
    void userWithNoGrantsIsForbidden() {
        UUID u = testUsers.withNoAccess();
        as(u).when().get("/api/v1/customers").then().statusCode(403);
        as(u).when().get("/api/v1/materials").then().statusCode(403);
        as(u).when().get("/api/v1/profiles").then().statusCode(403);
    }

    // --- VIEWER: read yes, write no ------------------------------------

    @Test
    void viewerCanReadButNotWrite() {
        UUID viewer = testUsers.withAccess("customers", AccessLevel.VIEWER);

        as(viewer).when().get("/api/v1/customers").then().statusCode(200);

        as(viewer).contentType("application/json")
                .body("{ \"scope\": \"GLOBAL\", \"name\": \"Nope Inc.\" }")
                .when().post("/api/v1/customers")
                .then().statusCode(403)
                .body("error.message", is("You have view-only access to this module."));

        as(viewer).when().delete("/api/v1/customers/1").then().statusCode(403);
    }

    @Test
    void editorCanWrite() {
        UUID editor = testUsers.withAccess("customers", AccessLevel.EDITOR);
        as(editor).contentType("application/json")
                .body("{ \"scope\": \"GLOBAL\", \"name\": \"Allowed Customer Co.\" }")
                .when().post("/api/v1/customers")
                .then().statusCode(201);
    }

    // --- grants do not leak between modules ----------------------------

    @Test
    void aGrantOnOneModuleDoesNotOpenAnother() {
        UUID u = testUsers.withAccess("customers", AccessLevel.EDITOR);
        as(u).when().get("/api/v1/customers").then().statusCode(200);
        as(u).when().get("/api/v1/materials").then().statusCode(403);
        as(u).when().get("/api/v1/accounts").then().statusCode(403);
        as(u).when().get("/api/v1/profiles").then().statusCode(403);
    }

    /**
     * Purchasing hangs off a supplier, so the Suppliers grant governs it.
     * "not 403" because 200 and 404 both mean authorization let it through.
     */
    @Test
    void suppliersGrantCoversPurchasing() {
        UUID u = testUsers.withAccess("suppliers", AccessLevel.VIEWER);
        as(u).when().get("/api/v1/profiles/1/suppliers/1/purchase-orders")
                .then().statusCode(not(403));
        as(u).when().get("/api/v1/profiles/1/suppliers/1/vouchers")
                .then().statusCode(not(403));
        // ...but the same nesting does not grant Job Orders.
        as(u).when().get("/api/v1/profiles/1/job-orders").then().statusCode(403);
    }

    /** A nested path is governed by the nested module, not by Corporate Profiles. */
    @Test
    void nestedCustomerPathUsesTheCustomersModule() {
        UUID profiles = testUsers.withAccess("corporate_profiles", AccessLevel.EDITOR);
        as(profiles).when().get("/api/v1/profiles/1/customers").then().statusCode(403);

        UUID customers = testUsers.withAccess("customers", AccessLevel.VIEWER);
        as(customers).when().get("/api/v1/profiles/1/customers").then().statusCode(not(403));
    }

    // --- admin ----------------------------------------------------------

    @Test
    void adminBypassesTheMatrix() {
        UUID admin = testUsers.ensureAdmin();
        as(admin).when().get("/api/v1/customers").then().statusCode(200);
        as(admin).when().get("/api/v1/materials").then().statusCode(200);
        as(admin).when().get("/api/v1/users").then().statusCode(200);
    }

    @Test
    void onlyAdminsManageUsers() {
        UUID u = testUsers.withAccess("customers", AccessLevel.EDITOR);
        as(u).when().get("/api/v1/users").then().statusCode(403);
        as(u).contentType("application/json")
                .body("{ \"firstName\": \"A\", \"lastName\": \"B\", \"email\": \"x@example.com\" }")
                .when().post("/api/v1/users").then().statusCode(403);
    }

    // --- self service ---------------------------------------------------

    @Test
    void aUserMayReadTheirOwnProfileButNotSomeoneElsesAndNotTheirOwnAccess() {
        UUID me = testUsers.withNoAccess();
        UUID other = testUsers.withNoAccess();

        // My Profile screen must work even with an empty matrix.
        as(me).when().get("/api/v1/users/" + me).then().statusCode(200);
        as(me).when().get("/api/v1/users/" + other).then().statusCode(403);

        // Reading my own grants is fine; granting myself more is not.
        as(me).when().get("/api/v1/users/" + me + "/modules").then().statusCode(200);
        as(me).contentType("application/json")
                .body("{ \"grants\": { \"customers\": \"EDITOR\" } }")
                .when().put("/api/v1/users/" + me + "/modules")
                .then().statusCode(403)
                .body("error.message", is("You cannot change your own access."));

        as(me).when().delete("/api/v1/users/" + me).then().statusCode(403);
    }

    // --- account state --------------------------------------------------

    @Test
    void aDisabledAccountIsRejectedEvenIfAdmin() {
        UUID disabled = testUsers.disabledAdmin();
        as(disabled).when().get("/api/v1/customers")
                .then().statusCode(403)
                .body("error.message", is("This account has been disabled."));
    }

    @Test
    void aValidTokenForAnUnknownUserIsRejected() {
        // Correctly signed, but the subject has no app_users row — what
        // happens when someone is added in Supabase Auth without the
        // handle_new_user trigger in place.
        as(UUID.randomUUID()).when().get("/api/v1/customers").then().statusCode(401);
    }

    // --- reference data -------------------------------------------------

    @Test
    void theModuleListStaysReadableSoTheUiCanRender() {
        UUID u = testUsers.withNoAccess();
        as(u).when().get("/api/v1/modules").then().statusCode(200);
    }
}
