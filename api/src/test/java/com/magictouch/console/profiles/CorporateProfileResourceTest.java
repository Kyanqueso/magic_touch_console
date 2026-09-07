package com.magictouch.console.profiles;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class CorporateProfileResourceTest extends AuthenticatedApiTest {

    private static final String BASE = "/api/v1/profiles";

    @Test
    void createNameOnlyThenFillIn() {
        // add: name only -> DRAFT
        String location = given()
                .contentType("application/json")
                .body("""
                    { "name": "Northgate Trading Corporation" }
                    """)
                .when().post(BASE)
                .then().statusCode(201)
                .body("status", is("DRAFT"))
                .body("registrations", hasSize(0))
                .body("filingTypes", hasSize(0))
                .extract().header("Location");

        // fill the detail form -> COMPLETE, with registrations + filing types
        given()
                .contentType("application/json")
                .body("""
                    {
                      "name": "Northgate Trading Corporation",
                      "address": "Makati City",
                      "tin": "123-456-789-000",
                      "wtaxAtc1": "WI010",
                      "wtaxAtc1Rate": 10.00,
                      "registrations": [
                        { "body": "DTI", "registrationNo": "2356744235", "registeredAt": "2026-08-06", "expiresAt": "2031-08-09" },
                        { "body": "SEC", "registrationNo": "CS202612345", "expiresAt": "2020-01-01" }
                      ],
                      "filingTypes": ["1601C", "1604C"]
                    }
                    """)
                .when().put(location)
                .then().statusCode(200)
                .body("status", is("COMPLETE"))
                .body("tin", is("123-456-789-000"))
                .body("registrations", hasSize(2))
                .body("registrations.find { it.body == 'DTI' }.active", is(true))
                .body("registrations.find { it.body == 'SEC' }.active", is(false))
                .body("filingTypes", hasItem("1601C"));

        // replace the child collections wholesale (exercises the orphan-delete-then-insert path)
        given()
                .contentType("application/json")
                .body("""
                    {
                      "name": "Northgate Trading Corporation",
                      "tin": "123-456-789-000",
                      "registrations": [
                        { "body": "DTI", "registrationNo": "2356744235" }
                      ],
                      "filingTypes": ["1601C", "1601C", "2550M"]
                    }
                    """)
                .when().put(location)
                .then().statusCode(200)
                .body("registrations", hasSize(1))
                .body("filingTypes", hasSize(2))
                .body("filingTypes", hasItem("2550M"));
    }

    @Test
    void listReturnsSummaries() {
        given().contentType("application/json").body("""
                { "name": "Sunshine Traders Corp." }
                """).when().post(BASE).then().statusCode(201);

        given().when().get(BASE + "?q=sunshine&sort=name")
                .then().statusCode(200)
                .body("total", notNullValue())
                .body("items.name", hasItem("Sunshine Traders Corp."))
                .body("items[0].registrations", nullValue());
    }

    /** The list-card tags count what the profile's own tabs would show. */
    @Test
    void listCountsJobOrdersAndCustomers() {
        String loc = given().contentType("application/json")
                .body("{ \"name\": \"Counted Corp.\" }")
                .when().post(BASE).then().statusCode(201).extract().header("Location");
        long profileId = Long.parseLong(loc.substring(loc.lastIndexOf('/') + 1));

        // Global customers are shared by every profile, so measure the change.
        long customersBefore = countsFor("Counted Corp.").getLong("customerCount");

        long customerId = given().contentType("application/json")
                .body("{ \"scope\": \"LOCAL\", \"name\": \"Counted Customer\" }")
                .when().post(BASE + "/" + profileId + "/customers")
                .then().statusCode(201).extract().jsonPath().getLong("id");

        given().contentType("application/json")
                .body("{ \"customerId\": %d, \"jobDescription\": \"Counted job\" }".formatted(customerId))
                .when().post(BASE + "/" + profileId + "/job-orders").then().statusCode(201);

        var after = countsFor("Counted Corp.");
        org.junit.jupiter.api.Assertions.assertEquals(1, after.getLong("jobOrderCount"));
        org.junit.jupiter.api.Assertions.assertEquals(customersBefore + 1, after.getLong("customerCount"));
    }

    /** A profile with no Local rows of its own still counts the shared Global ones. */
    @Test
    void listCountsGlobalCustomersAndSuppliersForEveryProfile() {
        String loc = given().contentType("application/json")
                .body("{ \"name\": \"Globals Only Corp.\" }")
                .when().post(BASE).then().statusCode(201).extract().header("Location");
        long profileId = Long.parseLong(loc.substring(loc.lastIndexOf('/') + 1));

        var before = countsFor("Globals Only Corp.");
        long customersBefore = before.getLong("customerCount");
        long suppliersBefore = before.getLong("supplierCount");

        // Added on another profile as Global, so this one sees them too.
        given().contentType("application/json")
                .body("{ \"scope\": \"GLOBAL\", \"name\": \"Shared Customer\" }")
                .when().post(BASE + "/" + profileId + "/customers").then().statusCode(201);
        given().contentType("application/json")
                .body("{ \"scope\": \"GLOBAL\", \"name\": \"Shared Supplier\" }")
                .when().post(BASE + "/" + profileId + "/suppliers").then().statusCode(201);

        var after = countsFor("Globals Only Corp.");
        org.junit.jupiter.api.Assertions.assertEquals(customersBefore + 1, after.getLong("customerCount"));
        org.junit.jupiter.api.Assertions.assertEquals(suppliersBefore + 1, after.getLong("supplierCount"));

        // And a second, unrelated profile sees the same shared rows.
        given().contentType("application/json")
                .body("{ \"name\": \"Other Globals Corp.\" }")
                .when().post(BASE).then().statusCode(201);
        var other = countsFor("Other Globals Corp.");
        org.junit.jupiter.api.Assertions.assertEquals(
                after.getLong("customerCount"), other.getLong("customerCount"));
        org.junit.jupiter.api.Assertions.assertEquals(
                after.getLong("supplierCount"), other.getLong("supplierCount"));
    }

    /** The card shows job orders when the module is on for the profile, suppliers when it is off. */
    @Test
    void listReportsSupplierCountAndWhetherJobOrdersAreOn() {
        String loc = given().contentType("application/json")
                .body("{ \"name\": \"Gated Corp.\" }")
                .when().post(BASE).then().statusCode(201).extract().header("Location");
        long profileId = Long.parseLong(loc.substring(loc.lastIndexOf('/') + 1));

        // A fresh profile has no module rows, so job orders are off.
        org.junit.jupiter.api.Assertions.assertFalse(countsFor("Gated Corp.").getBoolean("jobOrdersEnabled"));

        long suppliersBefore = countsFor("Gated Corp.").getLong("supplierCount");
        given().contentType("application/json")
                .body("{ \"scope\": \"LOCAL\", \"name\": \"Gated Supplier\" }")
                .when().post(BASE + "/" + profileId + "/suppliers").then().statusCode(201);
        org.junit.jupiter.api.Assertions.assertEquals(
                suppliersBefore + 1, countsFor("Gated Corp.").getLong("supplierCount"));

        given().contentType("application/json")
                .body("{ \"gates\": { \"job_orders\": true } }")
                .when().put(BASE + "/" + profileId + "/modules").then().statusCode(200);
        org.junit.jupiter.api.Assertions.assertTrue(countsFor("Gated Corp.").getBoolean("jobOrdersEnabled"));
    }

    private static io.restassured.path.json.JsonPath countsFor(String name) {
        String body = given().when().get(BASE + "?q=" + name.split(" ")[0])
                .then().statusCode(200).extract().asString();
        return io.restassured.path.json.JsonPath.from(body).setRootPath("items.find { it.name == '" + name + "' }");
    }

    @Test
    void archiveRestoreDeleteLifecycle() {
        String location = given().contentType("application/json")
                .body("""
                    { "name": "Lifecycle Corp." }
                    """)
                .when().post(BASE).then().statusCode(201)
                .extract().header("Location");

        given().when().delete(location).then().statusCode(409);
        given().when().post(location + "/archive").then().statusCode(204);
        given().when().get(location).then().statusCode(200).body("archived", is(true));
        given().when().post(location + "/restore").then().statusCode(204);
        given().when().get(location).then().statusCode(200).body("archived", is(false));
        given().when().post(location + "/archive").then().statusCode(204);
        given().when().delete(location).then().statusCode(204);
        given().when().get(location).then().statusCode(404);
    }

    @Test
    void rejectsBadTin() {
        given().contentType("application/json")
                .body("""
                    { "name": "Bad TIN Corp.", "tin": "999" }
                    """)
                .when().post(BASE)
                .then().statusCode(400)
                .body("error.code", is("VALIDATION"))
                .body("error.fields.tin", notNullValue());
    }

    @Test
    void rejectsRegistrationWithoutNumber() {
        given().contentType("application/json")
                .body("""
                    {
                      "name": "Incomplete Reg Corp.",
                      "registrations": [ { "body": "DTI" } ]
                    }
                    """)
                .when().post(BASE)
                .then().statusCode(400)
                .body("error.code", is("VALIDATION"));
    }

    @Test
    void unknownIdIs404() {
        given().when().get(BASE + "/999999").then().statusCode(404)
                .body("error.code", is("NOT_FOUND"));
    }
}
