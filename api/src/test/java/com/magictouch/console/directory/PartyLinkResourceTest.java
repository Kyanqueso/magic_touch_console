package com.magictouch.console.directory;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

/**
 * Also a routing regression test: an earlier draft of these endpoints lived on
 * a resource class rooted at {@code /api/v1/profiles/{profileId}} - the exact
 * same path template as {@code CorporateProfileResource}'s own root - which
 * silently broke live HTTP routing for both resources (a bare, bodyless 404)
 * despite compiling cleanly and looking correct in the generated OpenAPI doc.
 * These endpoints now live as ordinary methods on CustomerResource/SupplierResource.
 */
@QuarkusTest
class PartyLinkResourceTest extends AuthenticatedApiTest {

    long profileId;
    String customersBase;
    String suppliersBase;

    @BeforeEach
    void createProfile() {
        String loc = given().contentType("application/json")
                .body("{ \"name\": \"Party Link Test Co.\" }")
                .when().post("/api/v1/profiles")
                .then().statusCode(201).extract().header("Location");
        profileId = Long.parseLong(loc.substring(loc.lastIndexOf('/') + 1));
        customersBase = "/api/v1/profiles/" + profileId + "/customers";
        suppliersBase = "/api/v1/profiles/" + profileId + "/suppliers";
    }

    private long createCustomer() {
        return given().contentType("application/json")
                .body("""
                    { "scope": "LOCAL", "name": "Sunrise Trading Co.", "branchCode": "00099", "termsDays": 30 }
                    """)
                .when().post(customersBase)
                .then().statusCode(201).extract().jsonPath().getLong("id");
    }

    @Test
    void createsAnIndependentlyScopedLinkedSupplier() {
        long customerId = createCustomer();

        // not linked yet
        given().when().get(customersBase + "/" + customerId + "/link")
                .then().statusCode(200).body("linkedId", nullValue());

        // the supplier's own scope is an explicit choice, defaulting to Global
        // in the UI - it must never inherit the customer's LOCAL scope.
        long supplierId = given().contentType("application/json")
                .body("{ \"scope\": \"GLOBAL\" }")
                .when().post(customersBase + "/" + customerId + "/link-supplier")
                .then().statusCode(201)
                .body("name", is("Sunrise Trading Co."))
                .body("branchCode", is("00099"))
                .body("scope", is("GLOBAL"))
                .body("corporateProfileId", nullValue())
                // commercial terms are never copied - the supplier keeps its own default.
                .body("termsDays", is(0))
                .extract().jsonPath().getLong("id");

        given().when().get(customersBase + "/" + customerId + "/link")
                .then().statusCode(200).body("linkedId", is((int) supplierId));
        given().when().get(suppliersBase + "/" + supplierId + "/link")
                .then().statusCode(200).body("linkedId", is((int) customerId));
    }

    @Test
    void rejectsLinkingACustomerThatIsAlreadyLinked() {
        long customerId = createCustomer();
        given().contentType("application/json").body("{ \"scope\": \"GLOBAL\" }")
                .when().post(customersBase + "/" + customerId + "/link-supplier")
                .then().statusCode(201);

        given().contentType("application/json").body("{ \"scope\": \"GLOBAL\" }")
                .when().post(customersBase + "/" + customerId + "/link-supplier")
                .then().statusCode(409);
    }

    @Test
    void syncPropagatesIdentityButNeverCommercialTerms() {
        long customerId = createCustomer();
        long supplierId = given().contentType("application/json")
                .body("{ \"scope\": \"GLOBAL\" }")
                .when().post(customersBase + "/" + customerId + "/link-supplier")
                .then().statusCode(201).extract().jsonPath().getLong("id");

        given().contentType("application/json")
                .body("""
                    { "scope": "LOCAL", "name": "Sunrise Trading Co. RENAMED", "branchCode": "00099", "termsDays": 90 }
                    """)
                .when().post(customersBase + "/" + customerId + "/sync-linked")
                .then().statusCode(204);

        given().when().get(suppliersBase + "/" + supplierId)
                .then().statusCode(200)
                .body("name", is("Sunrise Trading Co. RENAMED"))
                // the sync's termsDays (90) must not have reached the supplier.
                .body("termsDays", is(0));
    }

    @Test
    void unlinkedPartyHasNoLink() {
        long customerId = createCustomer();
        given().when().get(customersBase + "/" + customerId + "/link")
                .then().statusCode(200).body("linkedId", nullValue());
    }
}
