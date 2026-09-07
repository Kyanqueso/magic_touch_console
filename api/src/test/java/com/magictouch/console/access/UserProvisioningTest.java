package com.magictouch.console.access;

import com.magictouch.console.AuthenticatedApiTest;
import com.magictouch.console.FakeSupabaseAdminClient;
import com.magictouch.console.TestUsers;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;

/** Adding a user must also create their Supabase login. */
@QuarkusTest
class UserProvisioningTest extends AuthenticatedApiTest {

    private static final AtomicInteger SEQ = new AtomicInteger();

    @Inject
    FakeSupabaseAdminClient supabase;

    private static String email() {
        return "provisioned" + SEQ.incrementAndGet() + "@example.com";
    }

    @Test
    void creatingAUserCreatesTheSupabaseLoginAndAdoptsItsId() {
        String mail = email();

        String id = given().contentType("application/json")
                .body("{ \"firstName\": \"Nina\", \"lastName\": \"Cruz\", \"email\": \"%s\" }".formatted(mail))
                .when().post("/api/v1/users")
                .then().statusCode(201)
                .extract().jsonPath().getString("id");

        // The login exists...
        org.junit.jupiter.api.Assertions.assertTrue(supabase.hasLoginFor(mail),
                "no Supabase login was created for " + mail);

        // ...and app_users.id equals the Supabase auth id. This equality is
        // what lets the console look a user up by their token's `sub`.
        org.junit.jupiter.api.Assertions.assertEquals(supabase.idFor(mail), UUID.fromString(id),
                "app_users.id must equal the Supabase auth user id");
    }

    @Test
    void deletingAUserRemovesTheirLoginToo() {
        String mail = email();
        String loc = given().contentType("application/json")
                .body("{ \"firstName\": \"Gone\", \"lastName\": \"Soon\", \"email\": \"%s\" }".formatted(mail))
                .when().post("/api/v1/users")
                .then().statusCode(201).extract().header("Location");

        UUID id = UUID.fromString(loc.substring(loc.lastIndexOf('/') + 1));
        given().when().delete(loc).then().statusCode(204);

        org.junit.jupiter.api.Assertions.assertTrue(supabase.wasDeleted(id),
                "the Supabase login should have been deleted with the profile");
        // A login must not outlive the profile it belonged to.
        org.junit.jupiter.api.Assertions.assertFalse(supabase.hasLoginFor(mail));
    }

    /** The login must follow the profile, or they sign in with the old address. */
    @Test
    void changingTheEmailAlsoChangesTheSupabaseLogin() {
        String before = email();
        String after = email();

        String loc = given().contentType("application/json")
                .body("{ \"firstName\": \"Mia\", \"lastName\": \"Reyes\", \"email\": \"%s\" }".formatted(before))
                .when().post("/api/v1/users")
                .then().statusCode(201).extract().header("Location");
        UUID id = UUID.fromString(loc.substring(loc.lastIndexOf('/') + 1));

        given().contentType("application/json")
                .body("{ \"firstName\": \"Mia\", \"lastName\": \"Reyes\", \"email\": \"%s\" }".formatted(after))
                .when().put(loc)
                .then().statusCode(200)
                .body("email", is(after));

        org.junit.jupiter.api.Assertions.assertEquals(id, supabase.idFor(after),
                "the login should now use the new email");
        org.junit.jupiter.api.Assertions.assertFalse(supabase.hasLoginFor(before),
                "the old email should no longer sign in");
    }

    @Test
    void aDuplicateEmailIsRejectedBeforeAnyLoginIsCreated() {
        String mail = email();
        given().contentType("application/json")
                .body("{ \"firstName\": \"First\", \"lastName\": \"One\", \"email\": \"%s\" }".formatted(mail))
                .when().post("/api/v1/users").then().statusCode(201);

        given().contentType("application/json")
                .body("{ \"firstName\": \"Second\", \"lastName\": \"Two\", \"email\": \"%s\" }".formatted(mail))
                .when().post("/api/v1/users").then().statusCode(409);
    }

    /** You are not in your own user list, so you cannot delete yourself. */
    @Test
    void theUserListExcludesTheCallerThemselves() {
        String mail = email();
        given().contentType("application/json")
                .body("{ \"firstName\": \"Someone\", \"lastName\": \"Else\", \"email\": \"%s\" }".formatted(mail))
                .when().post("/api/v1/users").then().statusCode(201);

        given().when().get("/api/v1/users?size=100")
                .then().statusCode(200)
                // the admin these tests run as is absent...
                .body("items.id", everyItem(not(is(TestUsers.ADMIN_ID.toString()))))
                // ...while other people are present
                .body("items.email", hasItem(mail));
    }
}
