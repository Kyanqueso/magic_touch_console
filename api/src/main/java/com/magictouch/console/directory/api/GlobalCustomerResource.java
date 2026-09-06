package com.magictouch.console.directory.api;

import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.directory.api.dto.PartyRequest;
import com.magictouch.console.directory.api.dto.PartyResponse;
import com.magictouch.console.directory.domain.CustomerService;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/** Global customers — not scoped to a corporate profile. Mirrors {@link CustomerResource}. */
@Path("/api/v1/customers")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Customers")
public class GlobalCustomerResource {

    private final CustomerService service;

    public GlobalCustomerResource(CustomerService service) {
        this.service = service;
    }

    @GET
    public PageResponse<PartyResponse> list(
            @QueryParam("page") Integer page,
            @QueryParam("size") Integer size,
            @QueryParam("sort") String sort,
            @QueryParam("q") String q,
            @QueryParam("tab") @DefaultValue("active") String tab) {
        return service.listGlobal(PageQuery.of(page, size), sort, q, "archive".equalsIgnoreCase(tab));
    }

    @GET
    @Path("{id}")
    public PartyResponse get(@PathParam("id") long id) {
        return service.getGlobal(id);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@Valid PartyRequest body, @Context UriInfo uriInfo) {
        PartyResponse created = service.createGlobal(body);
        return Response
                .created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(created.id())).build())
                .entity(created)
                .build();
    }

    @PUT
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public PartyResponse update(@PathParam("id") long id, @Valid PartyRequest body) {
        return service.updateGlobal(id, body);
    }

    @POST
    @Path("{id}/archive")
    public Response archive(@PathParam("id") long id) {
        service.archiveGlobal(id);
        return Response.noContent().build();
    }

    @POST
    @Path("{id}/restore")
    public Response restore(@PathParam("id") long id) {
        service.restoreGlobal(id);
        return Response.noContent().build();
    }

    @DELETE
    @Path("{id}")
    public Response delete(@PathParam("id") long id) {
        service.deleteGlobal(id);
        return Response.noContent().build();
    }
}
