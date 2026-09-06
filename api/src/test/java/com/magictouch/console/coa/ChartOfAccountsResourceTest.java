package com.magictouch.console.coa;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class ChartOfAccountsResourceTest extends AuthenticatedApiTest {

    private static final String ACCOUNTS = "/api/v1/accounts";
    private static final String CATEGORIES = "/api/v1/account-categories";

    @Test
    void listsSeededCategories() {
        given().when().get(CATEGORIES)
                .then().statusCode(200)
                .body("size()", greaterThanOrEqualTo(7))
                .body("name", hasItem("Assets (10000 Series)"));
    }

    @Test
    void createAccountUnderExistingCategoryThenNewCategory() {
        given().contentType("application/json")
                .body("""
                    {
                      "category": "Assets (10000 Series)",
                      "accountClass": "ASSET",
                      "subType": "Current Asset",
                      "code": "10100",
                      "name": "Cash on Hand and in Bank"
                    }
                    """)
                .when().post(ACCOUNTS)
                .then().statusCode(201)
                .body("code", is("10100"))
                .body("categoryName", is("Assets (10000 Series)"))
                .body("accountClass", is("ASSET"))
                .body("archived", is(false));

        // a category that isn't seeded gets created on the fly
        given().contentType("application/json")
                .body("""
                    {
                      "category": "Contra Assets (15000 Series)",
                      "accountClass": "ASSET",
                      "code": "15100",
                      "name": "Accumulated Depreciation"
                    }
                    """)
                .when().post(ACCOUNTS)
                .then().statusCode(201)
                .body("categoryName", is("Contra Assets (15000 Series)"));

        given().when().get(CATEGORIES)
                .then().statusCode(200)
                .body("name", hasItem("Contra Assets (15000 Series)"));
    }

    @Test
    void rejectsDuplicateCode() {
        given().contentType("application/json")
                .body("""
                    { "category": "Equity (30000 Series)", "accountClass": "EQUITY", "code": "30100", "name": "Owner Capital" }
                    """)
                .when().post(ACCOUNTS).then().statusCode(201);

        given().contentType("application/json")
                .body("""
                    { "category": "Equity (30000 Series)", "accountClass": "EQUITY", "code": "30100", "name": "Duplicate" }
                    """)
                .when().post(ACCOUNTS)
                .then().statusCode(409)
                .body("error.code", is("CONFLICT"));
    }

    @Test
    void rejectsOutOfRangeTaxRate() {
        given().contentType("application/json")
                .body("""
                    { "category": "Expenses (60000 Series)", "accountClass": "EXPENSE", "code": "60999", "name": "Bad Rate", "taxRate": 150 }
                    """)
                .when().post(ACCOUNTS)
                .then().statusCode(400)
                .body("error.fields.taxRate", notNullValue());
    }

    @Test
    void filterByCategoryAndLifecycle() {
        long catId = given().when().get(CATEGORIES)
                .then().statusCode(200)
                .extract().jsonPath().getLong("find { it.name == 'Revenue (40000 Series)' }.id");

        String location = given().contentType("application/json")
                .body("""
                    { "category": "Revenue (40000 Series)", "accountClass": "REVENUE", "code": "40100", "name": "Sales Revenue" }
                    """)
                .when().post(ACCOUNTS).then().statusCode(201)
                .extract().header("Location");

        given().when().get(ACCOUNTS + "?categoryId=" + catId)
                .then().statusCode(200)
                .body("items.code", hasItem("40100"));

        given().when().delete(location).then().statusCode(409);
        given().when().post(location + "/archive").then().statusCode(204);
        given().when().get(location).then().statusCode(200).body("archived", is(true));
        given().when().post(location + "/restore").then().statusCode(204);
        given().when().post(location + "/archive").then().statusCode(204);
        given().when().delete(location).then().statusCode(204);
        given().when().get(location).then().statusCode(404);
    }
}
