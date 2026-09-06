package com.magictouch.console.purchasing;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;

@QuarkusTest
class PurchasingResourceTest extends AuthenticatedApiTest {

    private static final AtomicInteger SEQ = new AtomicInteger();

    long profileId;
    long supplierId;
    long globalSupplierId;
    long materialId;
    String poBase;

    @BeforeEach
    void setUp() {
        String profileLoc = given().contentType("application/json")
                .body("{ \"name\": \"Purchasing Test Co.\" }")
                .when().post("/api/v1/profiles")
                .then().statusCode(201).extract().header("Location");
        profileId = idOf(profileLoc);

        // Local supplier — usable on POs
        supplierId = given().contentType("application/json")
                .body("{ \"scope\": \"LOCAL\", \"name\": \"MT Local Ink Supplier\" }")
                .when().post("/api/v1/profiles/" + profileId + "/suppliers")
                .then().statusCode(201).extract().jsonPath().getLong("id");

        // Global supplier — must NOT be usable on POs
        globalSupplierId = given().contentType("application/json")
                .body("{ \"scope\": \"GLOBAL\", \"name\": \"Global Freight Co.\" }")
                .when().post("/api/v1/profiles/" + profileId + "/suppliers")
                .then().statusCode(201).extract().jsonPath().getLong("id");

        String matCode = "PUR-MAT-" + SEQ.incrementAndGet();
        materialId = given().contentType("application/json")
                .body("{ \"group\": \"Newsprint\", \"code\": \"%s\", \"name\": \"Newsprint White\", \"unitPrice\": 0.50 }"
                        .formatted(matCode))
                .when().post("/api/v1/materials")
                .then().statusCode(201).extract().jsonPath().getLong("id");

        poBase = "/api/v1/profiles/" + profileId + "/suppliers/" + supplierId + "/purchase-orders";
    }

    private static long idOf(String location) {
        return Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
    }

    @Test
    void globalSupplierCannotHavePurchaseOrders() {
        given().contentType("application/json")
                .body("{ \"poDate\": \"2026-09-01\" }")
                .when().post("/api/v1/profiles/" + profileId + "/suppliers/" + globalSupplierId + "/purchase-orders")
                .then().statusCode(404);
    }

    @Test
    void fullPoToInvoiceToVoucherChain() {
        // 1. purchase order
        String poLoc = given().contentType("application/json")
                .body("""
                    { "poDate": "2026-09-01", "preparedBy": "John Dee", "approvedBy": "May Jobs" }
                    """)
                .when().post(poBase)
                .then().statusCode(201)
                .body("number", startsWith("PO-"))
                .body("itemCount", is(0))
                .body("total", is(0.0f))
                .extract().header("Location");

        // 2. two line items — unit price defaults from the material when omitted
        given().contentType("application/json")
                .body("{ \"materialId\": %d, \"qty\": 100, \"unit\": \"Pcs\" }".formatted(materialId))
                .when().post(poLoc + "/items")
                .then().statusCode(201)
                .body("lineNo", is(1))
                .body("unitPrice", is(0.5f))
                .body("amount", is(50.0f));

        given().contentType("application/json")
                .body("{ \"materialId\": %d, \"qty\": 25, \"unit\": \"Pcs\", \"unitPrice\": 2.0 }".formatted(materialId))
                .when().post(poLoc + "/items")
                .then().statusCode(201).body("lineNo", is(2)).body("amount", is(50.0f));

        given().when().get(poLoc)
                .then().statusCode(200)
                .body("items", hasSize(2))
                .body("total", is(100.0f));

        long poId = idOf(poLoc);
        String sinvBase = "/api/v1/profiles/" + profileId + "/suppliers/" + supplierId + "/sales-invoices";

        // 3. sales invoice off that PO — line items are read from the PO
        String sinvLoc = given().contentType("application/json")
                .body("{ \"purchaseOrderId\": %d, \"sinvDate\": \"2026-09-05\" }".formatted(poId))
                .when().post(sinvBase)
                .then().statusCode(201)
                .body("number", startsWith("S-INV-"))
                .body("purchaseOrderNumber", is("PO-" + poId))
                .body("items", hasSize(2))
                .body("total", is(100.0f))
                .extract().header("Location");

        long sinvId = idOf(sinvLoc);
        String vouBase = "/api/v1/profiles/" + profileId + "/suppliers/" + supplierId + "/vouchers";

        // 4. voucher off that S-INV
        String vouLoc = given().contentType("application/json")
                .body("{ \"supplierInvoiceId\": %d, \"voucherDate\": \"2026-09-08\", \"netAmount\": 96.00 }".formatted(sinvId))
                .when().post(vouBase)
                .then().statusCode(201)
                .body("number", startsWith("VOUC-"))
                .body("supplierInvoiceNumber", is("S-INV-" + sinvId))
                .body("paid", is(false))
                .body("netAmount", is(96.0f))
                .extract().header("Location");

        // 5. pay / unpay toggle
        given().when().post(vouLoc + "/pay").then().statusCode(200)
                .body("paid", is(true)).body("paidAt", notNullValue());
        given().when().post(vouLoc + "/unpay").then().statusCode(200).body("paid", is(false));
    }

    @Test
    void invoiceRejectsUnknownPurchaseOrder() {
        given().contentType("application/json")
                .body("{ \"purchaseOrderId\": 999999, \"sinvDate\": \"2026-09-05\" }")
                .when().post("/api/v1/profiles/" + profileId + "/suppliers/" + supplierId + "/sales-invoices")
                .then().statusCode(400)
                .body("error.fields.purchaseOrderId", notNullValue());
    }

    @Test
    void purchaseOrderLifecycle() {
        String poLoc = given().contentType("application/json")
                .body("{ \"poDate\": \"2026-09-01\" }")
                .when().post(poBase).then().statusCode(201).extract().header("Location");

        given().when().delete(poLoc).then().statusCode(409);
        given().when().post(poLoc + "/archive").then().statusCode(204);
        given().when().get(poLoc).then().statusCode(200).body("archived", is(true));
        given().when().post(poLoc + "/restore").then().statusCode(204);
        given().when().post(poLoc + "/archive").then().statusCode(204);
        given().when().delete(poLoc).then().statusCode(204);
        given().when().get(poLoc).then().statusCode(404);
    }
}
