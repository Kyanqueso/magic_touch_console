package com.magictouch.console.directory;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class CustomerResourceTest extends AuthenticatedApiTest {

    long profileId;
    String base;

    @BeforeEach
    void createProfile() {
        String loc = given().contentType("application/json")
                .body("{ \"name\": \"Customer Test Co.\" }")
                .when().post("/api/v1/profiles")
                .then().statusCode(201).extract().header("Location");
        profileId = Long.parseLong(loc.substring(loc.lastIndexOf('/') + 1));
        base = "/api/v1/profiles/" + profileId + "/customers";
    }

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
                .when().post(base)
                .then()
                .statusCode(201)
                .header("Location", notNullValue())
                .body("name", is("Sunrise Trading Co."))
                .body("scope", is("GLOBAL"))
                .body("corporateProfileId", nullValue())
                .body("archived", is(false));

        given()
                .when().get(base + "?q=sunrise")
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
                .when().post(base)
                .then()
                .statusCode(400)
                .body("error.code", is("VALIDATION"))
                .body("error.fields.tin", notNullValue());
    }

    @Test
    void rejectsADuplicateTin() {
        given().contentType("application/json")
                .body("{ \"scope\": \"GLOBAL\", \"name\": \"First TIN Co.\", \"tin\": \"111-222-333-000\" }")
                .when().post(base).then().statusCode(201);

        given().contentType("application/json")
                .body("{ \"scope\": \"GLOBAL\", \"name\": \"Second TIN Co.\", \"tin\": \"111-222-333-000\" }")
                .when().post(base)
                .then().statusCode(400)
                .body("error.fields.tin", notNullValue());
    }

    @Test
    void archiveThenRestoreThenDelete() {
        String location = given()
                .contentType("application/json")
                .body("""
                    { "scope": "GLOBAL", "name": "Lifecycle Co." }
                    """)
                .when().post(base)
                .then().statusCode(201)
                .extract().header("Location");

        // cannot hard-delete while active
        given().when().delete(location).then().statusCode(409);

        given().when().post(location + "/archive").then().statusCode(204);
        given().when().get(location).then().statusCode(200).body("archived", is(true));

        // an archived record is read-only
        given().contentType("application/json")
                .body("{ \"scope\": \"GLOBAL\", \"name\": \"Nope\" }")
                .when().put(location).then().statusCode(409);

        given().when().post(location + "/restore").then().statusCode(204);
        given().when().get(location).then().statusCode(200).body("archived", is(false));

        given().when().post(location + "/archive").then().statusCode(204);
        given().when().delete(location).then().statusCode(204);
        given().when().get(location).then().statusCode(404).body("error.code", is("NOT_FOUND"));
    }

    @Test
    void returns404ForUnknownId() {
        given().when().get(base + "/999999")
                .then().statusCode(404).body("error.code", is("NOT_FOUND"));
    }

    @Test
    void unknownProfileIs404() {
        given().when().get("/api/v1/profiles/999888/customers")
                .then().statusCode(404).body("error.code", is("NOT_FOUND"));
    }

    @Test
    void createsALocalCustomerVisibleOnlyInItsProfile() {
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

        // ...but not in another real profile's Local view
        String otherLoc = given().contentType("application/json")
                .body("{ \"name\": \"Other Co.\" }")
                .when().post("/api/v1/profiles")
                .then().statusCode(201).extract().header("Location");
        long otherId = Long.parseLong(otherLoc.substring(otherLoc.lastIndexOf('/') + 1));

        given().when().get("/api/v1/profiles/" + otherId + "/customers?scope=Local")
                .then().statusCode(200)
                .body("items.name", not(hasItem("MT Local Print Client")));
    }
}
