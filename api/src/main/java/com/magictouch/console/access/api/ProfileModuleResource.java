package com.magictouch.console.access.api;

import com.magictouch.console.access.api.dto.ModuleGateRequest;
import com.magictouch.console.access.api.dto.ModuleGateView;
import com.magictouch.console.access.domain.AccessService;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/api/v1/profiles/{profileId}/modules")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Access")
public class ProfileModuleResource {

    private final AccessService service;

    public ProfileModuleResource(AccessService service) {
        this.service = service;
    }

    @GET
    public List<ModuleGateView> list(@PathParam("profileId") long profileId) {
        return service.getProfileGates(profileId);
    }

    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    public List<ModuleGateView> set(@PathParam("profileId") long profileId, @Valid ModuleGateRequest body) {
        return service.setProfileGates(profileId, body.gates());
    }
}
