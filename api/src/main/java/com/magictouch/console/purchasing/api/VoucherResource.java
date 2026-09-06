package com.magictouch.console.purchasing.api;

import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.purchasing.api.dto.VoucherRequest;
import com.magictouch.console.purchasing.api.dto.VoucherResponse;
import com.magictouch.console.purchasing.api.dto.VoucherSummaryRow;
import com.magictouch.console.purchasing.domain.VoucherService;
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

@Path("/api/v1/profiles/{profileId}/suppliers/{supplierId}/vouchers")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Purchasing")
public class VoucherResource {

    private final VoucherService service;

    public VoucherResource(VoucherService service) {
        this.service = service;
    }

    @GET
    public PageResponse<VoucherSummaryRow> list(
            @PathParam("profileId") long profileId,
            @PathParam("supplierId") long supplierId,
            @QueryParam("page") Integer page,
            @QueryParam("size") Integer size,
            @QueryParam("sort") String sort,
            @QueryParam("q") String q,
            @QueryParam("tab") @DefaultValue("active") String tab) {
        return service.list(profileId, supplierId, PageQuery.of(page, size), sort, q,
                "archive".equalsIgnoreCase(tab));
    }

    @GET
    @Path("{id}")
    public VoucherResponse get(@PathParam("profileId") long profileId,
                              @PathParam("supplierId") long supplierId, @PathParam("id") long id) {
        return service.get(profileId, supplierId, id);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@PathParam("profileId") long profileId,
                           @PathParam("supplierId") long supplierId,
                           @Valid VoucherRequest body, @Context UriInfo uriInfo) {
        VoucherResponse created = service.create(profileId, supplierId, body);
        return Response
                .created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(created.id())).build())
                .entity(created).build();
    }

    @PUT
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public VoucherResponse update(@PathParam("profileId") long profileId,
                                  @PathParam("supplierId") long supplierId,
                                  @PathParam("id") long id, @Valid VoucherRequest body) {
        return service.update(profileId, supplierId, id, body);
    }

    @POST
    @Path("{id}/pay")
    public VoucherResponse pay(@PathParam("profileId") long profileId,
                              @PathParam("supplierId") long supplierId, @PathParam("id") long id) {
        return service.setPaid(profileId, supplierId, id, true);
    }

    @POST
    @Path("{id}/unpay")
    public VoucherResponse unpay(@PathParam("profileId") long profileId,
                                @PathParam("supplierId") long supplierId, @PathParam("id") long id) {
        return service.setPaid(profileId, supplierId, id, false);
    }

    @POST
    @Path("{id}/archive")
    public Response archive(@PathParam("profileId") long profileId,
                            @PathParam("supplierId") long supplierId, @PathParam("id") long id) {
        service.archive(profileId, supplierId, id);
        return Response.noContent().build();
    }

    @POST
    @Path("{id}/restore")
    public Response restore(@PathParam("profileId") long profileId,
                            @PathParam("supplierId") long supplierId, @PathParam("id") long id) {
        service.restore(profileId, supplierId, id);
        return Response.noContent().build();
    }

    @DELETE
    @Path("{id}")
    public Response delete(@PathParam("profileId") long profileId,
                           @PathParam("supplierId") long supplierId, @PathParam("id") long id) {
        service.delete(profileId, supplierId, id);
        return Response.noContent().build();
    }
}
