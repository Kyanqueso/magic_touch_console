package com.magictouch.console.access.api;

import com.magictouch.console.access.api.dto.AccessMatrixRequest;
import com.magictouch.console.access.api.dto.ModuleAccessView;
import com.magictouch.console.access.api.dto.UserRequest;
import com.magictouch.console.access.api.dto.UserResponse;
import com.magictouch.console.access.api.dto.UserSummaryRow;
import com.magictouch.console.access.domain.AccessService;
import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
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

import java.util.List;
import java.util.UUID;

@Path("/api/v1/users")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Access")
public class UserResource {

    private final AccessService service;

    public UserResource(AccessService service) {
        this.service = service;
    }

    @GET
    public PageResponse<UserSummaryRow> list(
            @QueryParam("page") Integer page,
            @QueryParam("size") Integer size,
            @QueryParam("sort") String sort,
            @QueryParam("q") String q) {
        return service.listUsers(PageQuery.of(page, size), sort, q);
    }

    @GET
    @Path("{id}")
    public UserResponse get(@PathParam("id") UUID id) {
        return service.getUser(id);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@Valid UserRequest body, @Context UriInfo uriInfo) {
        UserResponse created = service.createUser(body);
        return Response
                .created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(created.id())).build())
                .entity(created).build();
    }

    @PUT
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public UserResponse update(@PathParam("id") UUID id, @Valid UserRequest body) {
        return service.updateUser(id, body);
    }

    @POST
    @Path("{id}/disable")
    public UserResponse disable(@PathParam("id") UUID id) {
        return service.setDisabled(id, true);
    }

    @POST
    @Path("{id}/enable")
    public UserResponse enable(@PathParam("id") UUID id) {
        return service.setDisabled(id, false);
    }

    @DELETE
    @Path("{id}")
    public Response delete(@PathParam("id") UUID id) {
        service.deleteUser(id);
        return Response.noContent().build();
    }

    @GET
    @Path("{id}/modules")
    public List<ModuleAccessView> modules(@PathParam("id") UUID id) {
        return service.getMatrix(id);
    }

    @PUT
    @Path("{id}/modules")
    @Consumes(MediaType.APPLICATION_JSON)
    public List<ModuleAccessView> setModules(@PathParam("id") UUID id, @Valid AccessMatrixRequest body) {
        return service.setMatrix(id, body.grants());
    }
}
