package com.magictouch.console.directory;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class GlobalCustomerResourceTest extends AuthenticatedApiTest {

    private static final String BASE = "/api/v1/customers";

    @Test
    void createsAndListsAGlobalCustomer() {
        given()
                .contentType("application/json")
                .body("""
                    { "scope": "GLOBAL", "name": "Global Directory Co.", "termsDays": 45 }
                    """)
                .when().post(BASE)
                .then()
                .statusCode(201)
                .header("Location", notNullValue())
                .body("scope", is("GLOBAL"))
                .body("corporateProfileId", nullValue())
                .body("termsDays", is(45));

        given().when().get(BASE + "?q=global directory")
                .then().statusCode(200)
                .body("total", greaterThanOrEqualTo(1))
                .body("items.name", hasItem("Global Directory Co."));
    }

    @Test
    void archiveThenRestoreThenDelete() {
        String location = given()
                .contentType("application/json")
                .body("""
                    { "scope": "GLOBAL", "name": "Global Lifecycle Co." }
                    """)
                .when().post(BASE)
                .then().statusCode(201)
                .extract().header("Location");

        given().when().delete(location).then().statusCode(409);
        given().when().post(location + "/archive").then().statusCode(204);
        given().when().get(location).then().statusCode(200).body("archived", is(true));
        given().when().post(location + "/restore").then().statusCode(204);
        given().when().post(location + "/archive").then().statusCode(204);
        given().when().delete(location).then().statusCode(204);
        given().when().get(location).then().statusCode(404);
    }

    @Test
    void localRowsDoNotShowInTheGlobalList() {
        String profileLoc = given().contentType("application/json")
                .body("""
                    { "name": "Scoped Shop" }
                    """)
                .when().post("/api/v1/profiles")
                .then().statusCode(201)
                .extract().header("Location");
        long profileId = Long.parseLong(profileLoc.substring(profileLoc.lastIndexOf('/') + 1));

        given().contentType("application/json")
                .body("""
                    { "scope": "LOCAL", "name": "Scoped Only Client" }
                    """)
                .when().post("/api/v1/profiles/" + profileId + "/customers")
                .then().statusCode(201);

        given().when().get(BASE + "?size=500")
                .then().statusCode(200)
                .body("items.name", not(hasItem("Scoped Only Client")));
    }

    @Test
    void returns404ForUnknownId() {
        given().when().get(BASE + "/999999").then().statusCode(404);
    }
}
