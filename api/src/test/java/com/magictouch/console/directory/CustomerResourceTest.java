package com.magictouch.console.directory;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class CustomerResourceTest extends AuthenticatedApiTest {

    private static final String BASE = "/api/v1/profiles/1/customers";

    @Test
    void createsAndListsAGlobalCustomer() {
        given()
                .contentType("application/json")
                .body("""
                    {
                      "scope": "GLOBAL",
                      "name": "Sunrise Trading Co.",
                      "termsDays": 30,
                      "tin": "118-902-334-000"
                    }
                    """)
                .when().post(BASE)
                .then()
                .statusCode(201)
                .header("Location", notNullValue())
                .body("name", is("Sunrise Trading Co."))
                .body("scope", is("GLOBAL"))
                .body("corporateProfileId", nullValue())
                .body("archived", is(false));

        given()
                .when().get(BASE + "?q=sunrise")
                .then()
                .statusCode(200)
                .body("total", greaterThanOrEqualTo(1))
                .body("items.name", hasItem("Sunrise Trading Co."));
    }

    @Test
    void rejectsAMalformedTin() {
        given()
                .contentType("application/json")
                .body("""
                    { "scope": "GLOBAL", "name": "Bad TIN Co.", "tin": "12345" }
                    """)
                .when().post(BASE)
                .then()
                .statusCode(400)
                .body("error.code", is("VALIDATION"))
                .body("error.fields.tin", notNullValue());
    }

    @Test
    void archiveThenRestoreThenDelete() {
        String location = given()
                .contentType("application/json")
                .body("""
                    { "scope": "GLOBAL", "name": "Lifecycle Co." }
                    """)
                .when().post(BASE)
                .then().statusCode(201)
                .extract().header("Location");

        // cannot hard-delete while active
        given().when().delete(location).then().statusCode(409);

        given().when().post(location + "/archive").then().statusCode(204);
        given().when().get(location).then().statusCode(200).body("archived", is(true));

        given().when().post(location + "/restore").then().statusCode(204);
        given().when().get(location).then().statusCode(200).body("archived", is(false));

        given().when().post(location + "/archive").then().statusCode(204);
        given().when().delete(location).then().statusCode(204);
        given().when().get(location).then().statusCode(404).body("error.code", is("NOT_FOUND"));
    }

    @Test
    void returns404ForUnknownId() {
        given().when().get(BASE + "/999999")
                .then().statusCode(404).body("error.code", is("NOT_FOUND"));
    }

    @Test
    void createsALocalCustomerUnderARealProfile() {
        // a Local customer needs an existing corporate profile to hang off
        String profileLoc = given().contentType("application/json")
                .body("""
                    { "name": "MT Print Shop" }
                    """)
                .when().post("/api/v1/profiles")
                .then().statusCode(201)
                .extract().header("Location");
        long profileId = Long.parseLong(profileLoc.substring(profileLoc.lastIndexOf('/') + 1));

        String base = "/api/v1/profiles/" + profileId + "/customers";

        given().contentType("application/json")
                .body("""
                    { "scope": "LOCAL", "name": "MT Local Print Client", "termsDays": 30 }
                    """)
                .when().post(base)
                .then().statusCode(201)
                .body("scope", is("LOCAL"))
                .body("corporateProfileId", is((int) profileId));

        // visible in that profile...
        given().when().get(base + "?scope=Local")
                .then().statusCode(200)
                .body("items.name", hasItem("MT Local Print Client"));

        // ...but not in another profile's Local view
        given().when().get("/api/v1/profiles/999888/customers?scope=Local")
                .then().statusCode(200)
                .body("items.name", org.hamcrest.Matchers.not(hasItem("MT Local Print Client")));
    }
}
