package com.magictouch.console.materials;

import com.magictouch.console.AuthenticatedApiTest;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

/** Inventory (materials) is per corporate profile — no Global option. */
@QuarkusTest
class MaterialResourceTest extends AuthenticatedApiTest {

    long profileId;
    String materials;
    String groups;

    @BeforeEach
    void setUp() {
        String profileLoc = given().contentType("application/json")
                .body("{ \"name\": \"Inventory Test Co.\" }")
                .when().post("/api/v1/profiles")
                .then().statusCode(201).extract().header("Location");
        profileId = Long.parseLong(profileLoc.substring(profileLoc.lastIndexOf('/') + 1));
        materials = "/api/v1/profiles/" + profileId + "/materials";
        groups = "/api/v1/profiles/" + profileId + "/material-groups";
    }

    @Test
    void newProfileStartsWithNoGroups() {
        given().when().get(groups).then().statusCode(200).body("size()", is(0));
    }

    @Test
    void createMaterialUnderExistingGroupThenNewGroup() {
        given().contentType("application/json")
                .body("""
                    { "group": "Newsprint", "code": "NPW11", "name": "Newsprint White 8.5 x 11", "unitPrice": 0.2500 }
                    """)
                .when().post(materials)
                .then().statusCode(201)
                .body("code", is("NPW11"))
                .body("groupName", is("Newsprint"))
                .body("unitPrice", is(0.25f))
                .body("archived", is(false));

        given().contentType("application/json")
                .body("""
                    { "group": "Sticker", "code": "STK-A4", "name": "Sticker Paper A4", "unitPrice": 1.5 }
                    """)
                .when().post(materials)
                .then().statusCode(201)
                .body("groupName", is("Sticker"));

        given().when().get(groups).then().statusCode(200).body("name", hasItem("Sticker"));
    }

    @Test
    void rejectsDuplicateCode() {
        given().contentType("application/json")
                .body("""
                    { "group": "Bondpaper", "code": "BP80A4", "name": "Bondpaper 80gsm A4", "unitPrice": 0.5 }
                    """)
                .when().post(materials).then().statusCode(201);

        given().contentType("application/json")
                .body("""
                    { "group": "Bondpaper", "code": "BP80A4", "name": "Dup", "unitPrice": 0.5 }
                    """)
                .when().post(materials)
                .then().statusCode(409).body("error.code", is("CONFLICT"));
    }

    @Test
    void sameCodeIsFreeInAnotherProfile() {
        given().contentType("application/json")
                .body("""
                    { "group": "Bondpaper", "code": "SHARED-CODE", "name": "Bondpaper", "unitPrice": 0.5 }
                    """)
                .when().post(materials).then().statusCode(201);

        String otherProfileLoc = given().contentType("application/json")
                .body("{ \"name\": \"Inventory Test Co. 2\" }")
                .when().post("/api/v1/profiles")
                .then().statusCode(201).extract().header("Location");
        String otherProfileId = otherProfileLoc.substring(otherProfileLoc.lastIndexOf('/') + 1);
        String otherMaterials = "/api/v1/profiles/" + otherProfileId + "/materials";

        given().contentType("application/json")
                .body("""
                    { "group": "Bondpaper", "code": "SHARED-CODE", "name": "Bondpaper", "unitPrice": 0.5 }
                    """)
                .when().post(otherMaterials).then().statusCode(201);
    }

    @Test
    void rejectsMissingUnitPrice() {
        given().contentType("application/json")
                .body("""
                    { "group": "Onion Skin", "code": "OS11", "name": "Onion Skin 8.5 x 11" }
                    """)
                .when().post(materials)
                .then().statusCode(400)
                .body("error.fields.unitPrice", notNullValue());
    }

    @Test
    void updateAndLifecycle() {
        String location = given().contentType("application/json")
                .body("""
                    { "group": "Carbonless", "code": "CB2P", "name": "Carbonless 2-ply", "unitPrice": 0.75 }
                    """)
                .when().post(materials).then().statusCode(201)
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

    @Test
    void unknownProfileIs404() {
        given().when().get("/api/v1/profiles/999888/materials").then().statusCode(404);
    }
}
