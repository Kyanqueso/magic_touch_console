package com.magictouch.console.purchasing.api;

import com.magictouch.console.purchasing.api.dto.PurchaseOrderItemRequest;
import com.magictouch.console.purchasing.api.dto.PurchaseOrderItemResponse;
import com.magictouch.console.purchasing.domain.PurchaseOrderService;
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

@Path("/api/v1/profiles/{profileId}/suppliers/{supplierId}/purchase-orders/{poId}/items")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Purchasing")
public class PurchaseOrderItemResource {

    private final PurchaseOrderService service;

    public PurchaseOrderItemResource(PurchaseOrderService service) {
        this.service = service;
    }

    @GET
    public List<PurchaseOrderItemResponse> list(@PathParam("profileId") long profileId,
                                                @PathParam("supplierId") long supplierId,
                                                @PathParam("poId") long poId) {
        return service.listItems(profileId, supplierId, poId);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response add(@PathParam("profileId") long profileId,
                        @PathParam("supplierId") long supplierId,
                        @PathParam("poId") long poId,
                        @Valid PurchaseOrderItemRequest body, @Context UriInfo uriInfo) {
        PurchaseOrderItemResponse created = service.addItem(profileId, supplierId, poId, body);
        return Response
                .created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(created.id())).build())
                .entity(created).build();
    }

    @PUT
    @Path("{itemId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public PurchaseOrderItemResponse update(@PathParam("profileId") long profileId,
                                            @PathParam("supplierId") long supplierId,
                                            @PathParam("poId") long poId,
                                            @PathParam("itemId") long itemId,
                                            @Valid PurchaseOrderItemRequest body) {
        return service.updateItem(profileId, supplierId, poId, itemId, body);
    }

    @DELETE
    @Path("{itemId}")
    public Response remove(@PathParam("profileId") long profileId,
                           @PathParam("supplierId") long supplierId,
                           @PathParam("poId") long poId, @PathParam("itemId") long itemId) {
        service.removeItem(profileId, supplierId, poId, itemId);
        return Response.noContent().build();
    }
}
