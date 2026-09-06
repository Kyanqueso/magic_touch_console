package com.magictouch.console.joborders.api;

import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.joborders.api.dto.JobOrderRequest;
import com.magictouch.console.joborders.api.dto.JobOrderResponse;
import com.magictouch.console.joborders.api.dto.JobOrderSummaryRow;
import com.magictouch.console.joborders.domain.JobOrderService;
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

@Path("/api/v1/profiles/{profileId}/job-orders")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Job Orders")
public class JobOrderResource {

    private final JobOrderService service;

    public JobOrderResource(JobOrderService service) {
        this.service = service;
    }

    @GET
    public PageResponse<JobOrderSummaryRow> list(
            @PathParam("profileId") long profileId,
            @QueryParam("page") Integer page,
            @QueryParam("size") Integer size,
            @QueryParam("sort") String sort,
            @QueryParam("q") String q,
            @QueryParam("tab") @DefaultValue("active") String tab) {
        return service.list(profileId, PageQuery.of(page, size), sort, q,
                "archive".equalsIgnoreCase(tab));
    }

    @GET
    @Path("{id}")
    public JobOrderResponse get(@PathParam("profileId") long profileId, @PathParam("id") long id) {
        return service.get(profileId, id);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@PathParam("profileId") long profileId, @Valid JobOrderRequest body,
                           @Context UriInfo uriInfo) {
        JobOrderResponse created = service.create(profileId, body);
        return Response
                .created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(created.id())).build())
                .entity(created)
                .build();
    }

    @PUT
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public JobOrderResponse update(@PathParam("profileId") long profileId, @PathParam("id") long id,
                                   @Valid JobOrderRequest body) {
        return service.update(profileId, id, body);
    }

    @POST
    @Path("{id}/close")
    public JobOrderResponse close(@PathParam("profileId") long profileId, @PathParam("id") long id) {
        return service.close(profileId, id);
    }

    @POST
    @Path("{id}/reopen")
    public JobOrderResponse reopen(@PathParam("profileId") long profileId, @PathParam("id") long id) {
        return service.reopen(profileId, id);
    }

    @POST
    @Path("{id}/archive")
    public Response archive(@PathParam("profileId") long profileId, @PathParam("id") long id) {
        service.archive(profileId, id);
        return Response.noContent().build();
    }

    @POST
    @Path("{id}/restore")
    public Response restore(@PathParam("profileId") long profileId, @PathParam("id") long id) {
        service.restore(profileId, id);
        return Response.noContent().build();
    }

    @DELETE
    @Path("{id}")
    public Response delete(@PathParam("profileId") long profileId, @PathParam("id") long id) {
        service.delete(profileId, id);
        return Response.noContent().build();
    }
}
