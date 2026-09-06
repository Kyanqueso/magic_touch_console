package com.magictouch.console.joborders;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class JobOrderResourceTest extends AuthenticatedApiTest {

    private static final AtomicInteger SEQ = new AtomicInteger();

    long profileId;
    long customerId;
    long materialId;
    String materialCode;
    String base;

    @BeforeEach
    void setUp() {
        String profileLoc = given().contentType("application/json")
                .body("{ \"name\": \"JO Test Co.\" }")
                .when().post("/api/v1/profiles")
                .then().statusCode(201).extract().header("Location");
        profileId = idOf(profileLoc);
        base = "/api/v1/profiles/" + profileId + "/job-orders";

        customerId = given().contentType("application/json")
                .body("{ \"scope\": \"GLOBAL\", \"name\": \"Sunrise Trading Co.\" }")
                .when().post("/api/v1/profiles/" + profileId + "/customers")
                .then().statusCode(201).extract().jsonPath().getLong("id");

        materialCode = "JO-NPW-" + SEQ.incrementAndGet();
        materialId = given().contentType("application/json")
                .body("{ \"group\": \"Newsprint\", \"code\": \"%s\", \"name\": \"Newsprint White\", \"unitPrice\": 0.25 }"
                        .formatted(materialCode))
                .when().post("/api/v1/materials")
                .then().statusCode(201).extract().jsonPath().getLong("id");
    }

    private static long idOf(String location) {
        return Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
    }

    @Test
    void createGetListJobOrder() {
        String loc = given().contentType("application/json")
                .body("""
                    {
                      "customerId": %d,
                      "jobDescription": "Sales Invoice Printing",
                      "branch": "Main Branch",
                      "dateOrdered": "2026-09-01",
                      "deliveryDate": "2026-09-10",
                      "qty": 5000,
                      "unit": "pcs",
                      "unitPrice": 0.50
                    }
                    """.formatted(customerId))
                .when().post(base)
                .then().statusCode(201)
                .body("id", greaterThanOrEqualTo(1001))
                .body("status", is("OPEN"))
                .body("customerName", is("Sunrise Trading Co."))
                .body("materials", hasSize(0))
                .extract().header("Location");

        given().when().get(loc).then().statusCode(200).body("jobDescription", is("Sales Invoice Printing"));

        given().when().get(base + "?q=sales")
                .then().statusCode(200)
                .body("items.jobDescription", hasItem("Sales Invoice Printing"));
    }

    @Test
    void rejectsDeliveryBeforeOrderDate() {
        given().contentType("application/json")
                .body("""
                    { "customerId": %d, "dateOrdered": "2026-09-10", "deliveryDate": "2026-09-01" }
                    """.formatted(customerId))
                .when().post(base)
                .then().statusCode(400)
                .body("error.fields.deliveryDate", notNullValue());
    }

    @Test
    void rejectsUnknownCustomer() {
        given().contentType("application/json")
                .body("{ \"customerId\": 999999 }")
                .when().post(base)
                .then().statusCode(400)
                .body("error.fields.customerId", notNullValue());
    }

    @Test
    void materialsAddListUpdateRemove() {
        String loc = given().contentType("application/json")
                .body("{ \"customerId\": %d }".formatted(customerId))
                .when().post(base).then().statusCode(201).extract().header("Location");

        String materialsUrl = loc + "/materials";

        given().contentType("application/json")
                .body("""
                    { "materialId": %d, "textColor": "Blue", "ink1": "None", "qtyNeeded": 10 }
                    """.formatted(materialId))
                .when().post(materialsUrl)
                .then().statusCode(201)
                .body("lineNo", is(1))
                .body("materialCode", is(materialCode));

        String line2Loc = given().contentType("application/json")
                .body("{ \"materialId\": %d, \"textColor\": \"Red\" }".formatted(materialId))
                .when().post(materialsUrl)
                .then().statusCode(201)
                .body("lineNo", is(2))
                .extract().header("Location");

        given().when().get(materialsUrl).then().statusCode(200).body("$", hasSize(2));

        given().contentType("application/json")
                .body("{ \"materialId\": %d, \"textColor\": \"Green\", \"qtyNeeded\": 42 }".formatted(materialId))
                .when().put(line2Loc)
                .then().statusCode(200)
                .body("textColor", is("Green"))
                .body("qtyNeeded", is(42));

        given().when().delete(line2Loc).then().statusCode(204);
        given().when().get(materialsUrl).then().statusCode(200).body("$", hasSize(1));
    }

    @Test
    void closedJobOrderIsReadOnlyUntilReopened() {
        String loc = given().contentType("application/json")
                .body("{ \"customerId\": %d }".formatted(customerId))
                .when().post(base).then().statusCode(201).extract().header("Location");

        given().when().post(loc + "/close").then().statusCode(200).body("status", is("CLOSED"));

        // edits blocked while closed
        given().contentType("application/json")
                .body("{ \"customerId\": %d, \"jobDescription\": \"nope\" }".formatted(customerId))
                .when().put(loc).then().statusCode(409);

        given().contentType("application/json")
                .body("{ \"materialId\": %d }".formatted(materialId))
                .when().post(loc + "/materials").then().statusCode(409);

        given().when().post(loc + "/reopen").then().statusCode(200).body("status", is("OPEN"));

        given().contentType("application/json")
                .body("{ \"customerId\": %d, \"jobDescription\": \"now ok\" }".formatted(customerId))
                .when().put(loc).then().statusCode(200).body("jobDescription", is("now ok"));
    }

    @Test
    void archiveRestoreDeleteLifecycle() {
        String loc = given().contentType("application/json")
                .body("{ \"customerId\": %d }".formatted(customerId))
                .when().post(base).then().statusCode(201).extract().header("Location");

        given().when().delete(loc).then().statusCode(409);
        given().when().post(loc + "/archive").then().statusCode(204);
        given().when().get(loc).then().statusCode(200).body("archived", is(true));
        given().when().post(loc + "/restore").then().statusCode(204);
        given().when().post(loc + "/archive").then().statusCode(204);
        given().when().delete(loc).then().statusCode(204);
        given().when().get(loc).then().statusCode(404);
    }
}
