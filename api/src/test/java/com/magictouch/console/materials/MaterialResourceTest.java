package com.magictouch.console.materials;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class MaterialResourceTest extends AuthenticatedApiTest {

    private static final String MATERIALS = "/api/v1/materials";
    private static final String GROUPS = "/api/v1/material-groups";

    @Test
    void listsSeededGroups() {
        given().when().get(GROUPS)
                .then().statusCode(200)
                .body("size()", greaterThanOrEqualTo(5))
                .body("name", hasItem("Newsprint"));
    }

    @Test
    void createMaterialUnderExistingGroupThenNewGroup() {
        given().contentType("application/json")
                .body("""
                    { "group": "Newsprint", "code": "NPW11", "name": "Newsprint White 8.5 x 11", "unitPrice": 0.2500 }
                    """)
                .when().post(MATERIALS)
                .then().statusCode(201)
                .body("code", is("NPW11"))
                .body("groupName", is("Newsprint"))
                .body("unitPrice", is(0.25f))
                .body("archived", is(false));

        given().contentType("application/json")
                .body("""
                    { "group": "Sticker", "code": "STK-A4", "name": "Sticker Paper A4", "unitPrice": 1.5 }
                    """)
                .when().post(MATERIALS)
                .then().statusCode(201)
                .body("groupName", is("Sticker"));

        given().when().get(GROUPS).then().statusCode(200).body("name", hasItem("Sticker"));
    }

    @Test
    void rejectsDuplicateCode() {
        given().contentType("application/json")
                .body("""
                    { "group": "Bondpaper", "code": "BP80A4", "name": "Bondpaper 80gsm A4", "unitPrice": 0.5 }
                    """)
                .when().post(MATERIALS).then().statusCode(201);

        given().contentType("application/json")
                .body("""
                    { "group": "Bondpaper", "code": "BP80A4", "name": "Dup", "unitPrice": 0.5 }
                    """)
                .when().post(MATERIALS)
                .then().statusCode(409).body("error.code", is("CONFLICT"));
    }

    @Test
    void rejectsMissingUnitPrice() {
        given().contentType("application/json")
                .body("""
                    { "group": "Onion Skin", "code": "OS11", "name": "Onion Skin 8.5 x 11" }
                    """)
                .when().post(MATERIALS)
                .then().statusCode(400)
                .body("error.fields.unitPrice", notNullValue());
    }

    @Test
    void updateAndLifecycle() {
        String location = given().contentType("application/json")
                .body("""
                    { "group": "Carbonless", "code": "CB2P", "name": "Carbonless 2-ply", "unitPrice": 0.75 }
                    """)
                .when().post(MATERIALS).then().statusCode(201)
                .extract().header("Location");

        given().contentType("application/json")
                .body("""
                    { "group": "Carbonless", "code": "CB2P", "name": "Carbonless 2-ply 8.5 x 11", "unitPrice": 0.8000 }
                    """)
                .when().put(location)
                .then().statusCode(200)
                .body("name", is("Carbonless 2-ply 8.5 x 11"))
                .body("unitPrice", is(0.8f));

        given().when().delete(location).then().statusCode(409);
        given().when().post(location + "/archive").then().statusCode(204);
        given().when().delete(location).then().statusCode(204);
        given().when().get(location).then().statusCode(404);
    }
}
