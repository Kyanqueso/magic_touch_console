package com.magictouch.console.coa.api;

import com.magictouch.console.coa.api.dto.AccountCategoryRequest;
import com.magictouch.console.coa.api.dto.AccountCategoryResponse;
import com.magictouch.console.coa.domain.ChartOfAccountsService;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/api/v1/account-categories")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Chart of Accounts")
public class AccountCategoryResource {

    private final ChartOfAccountsService service;

    public AccountCategoryResource(ChartOfAccountsService service) {
        this.service = service;
    }

    @GET
    public List<AccountCategoryResponse> list() {
        return service.listCategories();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@Valid AccountCategoryRequest body, @Context UriInfo uriInfo) {
        AccountCategoryResponse created = service.createCategory(body);
        return Response
                .created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(created.id())).build())
                .entity(created)
                .build();
    }
}
