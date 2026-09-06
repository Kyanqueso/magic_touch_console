package com.magictouch.console.access.api;

import com.magictouch.console.access.api.dto.ModuleResponse;
import com.magictouch.console.access.domain.AccessService;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/api/v1/modules")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Access")
public class ModuleResource {

    private final AccessService service;

    public ModuleResource(AccessService service) {
        this.service = service;
    }

    @GET
    public List<ModuleResponse> list() {
        return service.listModules();
    }
}
