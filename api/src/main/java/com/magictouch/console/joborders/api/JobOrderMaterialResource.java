package com.magictouch.console.joborders.api;

import com.magictouch.console.joborders.api.dto.JobOrderMaterialRequest;
import com.magictouch.console.joborders.api.dto.JobOrderMaterialResponse;
import com.magictouch.console.joborders.domain.JobOrderService;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/api/v1/profiles/{profileId}/job-orders/{jobId}/materials")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Job Orders")
public class JobOrderMaterialResource {

    private final JobOrderService service;

    public JobOrderMaterialResource(JobOrderService service) {
        this.service = service;
    }

    @GET
    public List<JobOrderMaterialResponse> list(@PathParam("profileId") long profileId,
                                               @PathParam("jobId") long jobId) {
        return service.listMaterials(profileId, jobId);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response add(@PathParam("profileId") long profileId, @PathParam("jobId") long jobId,
                        @Valid JobOrderMaterialRequest body, @Context UriInfo uriInfo) {
        JobOrderMaterialResponse created = service.addMaterial(profileId, jobId, body);
        return Response
                .created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(created.id())).build())
                .entity(created)
                .build();
    }

    @PUT
    @Path("{materialLineId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public JobOrderMaterialResponse update(@PathParam("profileId") long profileId,
                                           @PathParam("jobId") long jobId,
                                           @PathParam("materialLineId") long materialLineId,
                                           @Valid JobOrderMaterialRequest body) {
        return service.updateMaterial(profileId, jobId, materialLineId, body);
    }

    @DELETE
    @Path("{materialLineId}")
    public Response remove(@PathParam("profileId") long profileId, @PathParam("jobId") long jobId,
                           @PathParam("materialLineId") long materialLineId) {
        service.removeMaterial(profileId, jobId, materialLineId);
        return Response.noContent().build();
    }
}
