package com.magictouch.console.materials.api;

import com.magictouch.console.materials.api.dto.MaterialGroupRequest;
import com.magictouch.console.materials.api.dto.MaterialGroupResponse;
import com.magictouch.console.materials.domain.MaterialService;
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

@Path("/api/v1/material-groups")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Materials")
public class MaterialGroupResource {

    private final MaterialService service;

    public MaterialGroupResource(MaterialService service) {
        this.service = service;
    }

    @GET
    public List<MaterialGroupResponse> list() {
        return service.listGroups();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@Valid MaterialGroupRequest body, @Context UriInfo uriInfo) {
        MaterialGroupResponse created = service.createGroup(body);
        return Response
                .created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(created.id())).build())
                .entity(created)
                .build();
    }
}
