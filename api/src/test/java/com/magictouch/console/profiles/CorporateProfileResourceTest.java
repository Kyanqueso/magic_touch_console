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
