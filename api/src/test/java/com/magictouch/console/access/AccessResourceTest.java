package com.magictouch.console.access;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class AccessResourceTest extends AuthenticatedApiTest {

    /** Seeded modules — V002 plus `materials` from V004. Bump when a module is added. */
    private static final int MODULE_COUNT = 6;

    private static final AtomicInteger SEQ = new AtomicInteger();

    private static String email() {
        return "user" + SEQ.incrementAndGet() + "@example.com";
    }

    private String createUser(String body) {
        return given().contentType("application/json").body(body)
                .when().post("/api/v1/users")
                .then().statusCode(201).extract().header("Location");
    }

    @Test
    void listsSeededModules() {
        // Exact keys AND order: the list is sorted by sort_order, which drives
        // the order of the console's nav (web/src/components/AppHeader.jsx).
        given().when().get("/api/v1/modules")
                .then().statusCode(200)
                .body("key", contains(
                        "corporate_profiles", "chart_of_accounts", "customers",
                        "suppliers", "materials", "job_orders"));
    }

    @Test
    void createUserGetsEmployeeNumberAndEmptyMatrix() {
        String loc = createUser("""
            { "firstName": "Juan", "lastName": "Dela Cruz", "email": "%s" }
            """.formatted(email()));

        given().when().get(loc)
                .then().statusCode(200)
                .body("role", is("USER"))
                .body("disabled", is(false))
                .body("employeeNo", notNullValue())
                .body("modules.size()", is(MODULE_COUNT))
                .body("modules.access", everyItem(is("NO_ACCESS")));
    }

    @Test
    void setAndClearTheAccessMatrix() {
        String loc = createUser("""
            { "firstName": "Ana", "lastName": "Reyes", "email": "%s" }
            """.formatted(email()));

        given().contentType("application/json")
                .body("""
                    { "grants": { "customers": "EDITOR", "job_orders": "VIEWER" } }
                    """)
                .when().put(loc + "/modules")
                .then().statusCode(200)
                .body("find { it.key == 'customers' }.access", is("EDITOR"))
                .body("find { it.key == 'job_orders' }.access", is("VIEWER"))
                .body("find { it.key == 'suppliers' }.access", is("NO_ACCESS"));

        // NO_ACCESS clears the row; unlisted modules untouched
        given().contentType("application/json")
                .body("""
                    { "grants": { "customers": "NO_ACCESS" } }
                    """)
                .when().put(loc + "/modules")
                .then().statusCode(200)
                .body("find { it.key == 'customers' }.access", is("NO_ACCESS"))
                .body("find { it.key == 'job_orders' }.access", is("VIEWER"));
    }

    @Test
    void createUserWithInlineGrants() {
        String loc = createUser("""
            {
              "firstName": "Bo", "lastName": "Tan", "email": "%s", "role": "ADMIN",
              "grants": { "chart_of_accounts": "EDITOR" }
            }
            """.formatted(email()));

        given().when().get(loc)
                .then().statusCode(200)
                .body("role", is("ADMIN"))
                .body("modules.find { it.key == 'chart_of_accounts' }.access", is("EDITOR"));
    }

    @Test
    void rejectsDuplicateEmailAndBadName() {
        String mail = email();
        createUser("{ \"firstName\": \"A\", \"lastName\": \"B\", \"email\": \"%s\" }".formatted(mail));

        given().contentType("application/json")
                .body("{ \"firstName\": \"C\", \"lastName\": \"D\", \"email\": \"%s\" }".formatted(mail))
                .when().post("/api/v1/users")
                .then().statusCode(409);

        given().contentType("application/json")
                .body("""
                    { "firstName": "This name is definitely longer than the fifty character maximum allowed",
                      "lastName": "X", "email": "%s" }
                    """.formatted(email()))
                .when().post("/api/v1/users")
                .then().statusCode(400)
                .body("error.fields.firstName", notNullValue());
    }

    @Test
    void disableEnableDeleteLifecycle() {
        String loc = createUser("""
            { "firstName": "Del", "lastName": "Ete", "email": "%s" }
            """.formatted(email()));

        given().when().post(loc + "/disable").then().statusCode(200).body("disabled", is(true));
        given().when().post(loc + "/enable").then().statusCode(200).body("disabled", is(false));
        given().when().delete(loc).then().statusCode(204);
        given().when().get(loc).then().statusCode(404);
    }

    @Test
    void perProfileModuleGates() {
        long profileId = Long.parseLong(given().contentType("application/json")
                .body("{ \"name\": \"Gate Test Co.\" }")
                .when().post("/api/v1/profiles")
                .then().statusCode(201).extract().header("Location")
                .replaceAll(".*/", ""));

        String gates = "/api/v1/profiles/" + profileId + "/modules";

        given().when().get(gates)
                .then().statusCode(200)
                .body("size()", is(MODULE_COUNT))
                .body("enabled", everyItem(is(false)));

        given().contentType("application/json")
                .body("{ \"gates\": { \"job_orders\": true } }")
                .when().put(gates)
                .then().statusCode(200)
                .body("find { it.key == 'job_orders' }.enabled", is(true))
                .body("find { it.key == 'customers' }.enabled", is(false));
    }

    @Test
    void listUsers() {
        createUser("{ \"firstName\": \"List\", \"lastName\": \"Me\", \"email\": \"%s\" }".formatted(email()));
        given().when().get("/api/v1/users?q=list")
                .then().statusCode(200)
                .body("total", greaterThanOrEqualTo(1))
                .body("items.firstName", hasItem("List"));
    }
}
