package com.magictouch.console.directory;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class SupplierResourceTest extends AuthenticatedApiTest {

    private static final String BASE = "/api/v1/profiles/1/suppliers";

    @Test
    void createsAndListsAGlobalSupplier() {
        given()
                .contentType("application/json")
                .body("""
                    {
                      "scope": "GLOBAL",
                      "name": "Kitagawa Industrial Supply Co.",
                      "termsDays": 60,
                      "companyType": "CORPORATION",
                      "taxType": "ZERO_RATED"
                    }
                    """)
                .when().post(BASE)
                .then()
                .statusCode(201)
                .body("name", is("Kitagawa Industrial Supply Co."))
                .body("companyType", is("CORPORATION"))
                .body("taxType", is("ZERO_RATED"));

        given()
                .when().get(BASE + "?sort=-createdAt&size=5")
                .then()
                .statusCode(200)
                .body("total", greaterThanOrEqualTo(1))
                .body("items.name", hasItem("Kitagawa Industrial Supply Co."));
    }

    @Test
    void rejectsABlankName() {
        given()
                .contentType("application/json")
                .body("""
                    { "scope": "GLOBAL", "name": "  " }
                    """)
                .when().post(BASE)
                .then()
                .statusCode(400)
                .body("error.code", is("VALIDATION"))
                .body("error.fields.name", notNullValue());
    }
}
