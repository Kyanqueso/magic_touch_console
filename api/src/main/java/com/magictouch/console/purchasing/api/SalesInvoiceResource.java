package com.magictouch.console.purchasing.api;

import com.magictouch.console.common.page.PageQuery;
import com.magictouch.console.common.page.PageResponse;
import com.magictouch.console.purchasing.api.dto.SalesInvoiceRequest;
import com.magictouch.console.purchasing.api.dto.SalesInvoiceResponse;
import com.magictouch.console.purchasing.api.dto.SalesInvoiceSummaryRow;
import com.magictouch.console.purchasing.domain.SalesInvoiceService;
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

@Path("/api/v1/profiles/{profileId}/suppliers/{supplierId}/sales-invoices")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Purchasing")
public class SalesInvoiceResource {

    private final SalesInvoiceService service;

    public SalesInvoiceResource(SalesInvoiceService service) {
        this.service = service;
    }

    @GET
    public PageResponse<SalesInvoiceSummaryRow> list(
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
    public SalesInvoiceResponse get(@PathParam("profileId") long profileId,
                                    @PathParam("supplierId") long supplierId,
                                    @PathParam("id") long id) {
        return service.get(profileId, supplierId, id);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@PathParam("profileId") long profileId,
                           @PathParam("supplierId") long supplierId,
                           @Valid SalesInvoiceRequest body, @Context UriInfo uriInfo) {
        SalesInvoiceResponse created = service.create(profileId, supplierId, body);
        return Response
                .created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(created.id())).build())
                .entity(created).build();
    }

    @PUT
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public SalesInvoiceResponse update(@PathParam("profileId") long profileId,
                                       @PathParam("supplierId") long supplierId,
                                       @PathParam("id") long id, @Valid SalesInvoiceRequest body) {
        return service.update(profileId, supplierId, id, body);
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
