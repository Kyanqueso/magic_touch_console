package com.magictouch.console.materials.api;

import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.materials.api.dto.MaterialRequest;
import com.magictouch.console.materials.api.dto.MaterialResponse;
import com.magictouch.console.materials.domain.MaterialService;
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

@Path("/api/v1/materials")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Materials")
public class MaterialResource {

    private final MaterialService service;

    public MaterialResource(MaterialService service) {
        this.service = service;
    }

    @GET
    public PageResponse<MaterialResponse> list(
            @QueryParam("page") Integer page,
            @QueryParam("size") Integer size,
            @QueryParam("sort") String sort,
            @QueryParam("q") String q,
            @QueryParam("groupId") Long groupId,
            @QueryParam("tab") @DefaultValue("active") String tab) {
        return service.list(PageQuery.of(page, size), sort, q,
                "archive".equalsIgnoreCase(tab), groupId);
    }

    @GET
    @Path("{id}")
    public MaterialResponse get(@PathParam("id") long id) {
        return service.get(id);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@Valid MaterialRequest body, @Context UriInfo uriInfo) {
        MaterialResponse created = service.create(body);
        return Response
                .created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(created.id())).build())
                .entity(created)
                .build();
    }

    @PUT
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public MaterialResponse update(@PathParam("id") long id, @Valid MaterialRequest body) {
        return service.update(id, body);
    }

    @POST
    @Path("{id}/archive")
    public Response archive(@PathParam("id") long id) {
        service.archive(id);
        return Response.noContent().build();
    }

    @POST
    @Path("{id}/restore")
    public Response restore(@PathParam("id") long id) {
        service.restore(id);
        return Response.noContent().build();
    }

    @DELETE
    @Path("{id}")
    public Response delete(@PathParam("id") long id) {
        service.delete(id);
        return Response.noContent().build();
    }
}
