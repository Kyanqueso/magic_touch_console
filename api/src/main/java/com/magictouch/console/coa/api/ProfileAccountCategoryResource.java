package com.magictouch.console.coa.api;

import com.magictouch.console.coa.api.dto.AccountCategoryRequest;
import com.magictouch.console.coa.api.dto.AccountCategoryResponse;
import com.magictouch.console.coa.domain.ChartOfAccountsService;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

/** A corporate profile's own account categories: its Local ones, plus every Global one. */
@Path("/api/v1/profiles/{profileId}/account-categories")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Chart of Accounts")
public class ProfileAccountCategoryResource {

    private final ChartOfAccountsService service;

    public ProfileAccountCategoryResource(ChartOfAccountsService service) {
        this.service = service;
    }

    @GET
    public List<AccountCategoryResponse> list(@PathParam("profileId") long profileId) {
        return service.listCategories(profileId);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@PathParam("profileId") long profileId, @Valid AccountCategoryRequest body,
                           @Context UriInfo uriInfo) {
        AccountCategoryResponse created = service.createCategory(profileId, body);
        return Response
                .created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(created.id())).build())
                .entity(created)
                .build();
    }
}
