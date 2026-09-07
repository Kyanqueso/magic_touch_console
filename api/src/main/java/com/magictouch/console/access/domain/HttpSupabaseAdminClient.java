package com.magictouch.console.access.domain;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.magictouch.console.common.error.ApiException;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/**
 * Talks to the Supabase Auth Admin API. Plain HTTP rather than a REST client
 * extension to keep function.zip small. Needs the service-role key: server-side only.
 */
@ApplicationScoped
public class HttpSupabaseAdminClient implements SupabaseAdminClient {

    private static final Logger LOG = Logger.getLogger(HttpSupabaseAdminClient.class);

    private final String baseUrl;
    private final Optional<String> serviceRoleKey;
    private final ObjectMapper json;
    private final HttpClient http;

    public HttpSupabaseAdminClient(
            @ConfigProperty(name = "supabase.url", defaultValue = "") String baseUrl,
            @ConfigProperty(name = "supabase.service-role-key") Optional<String> serviceRoleKey,
            ObjectMapper json) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.serviceRoleKey = serviceRoleKey.filter(k -> !k.isBlank());
        this.json = json;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    @Override
    public UUID createAuthUser(String email) {
        // email_confirm lets them go straight to "Forgot password" and set their own.
        String body;
        try {
            body = json.writeValueAsString(java.util.Map.of(
                    "email", email,
                    "email_confirm", true));
        } catch (Exception e) {
            throw new IllegalStateException("Could not build the Supabase request", e);
        }

        HttpResponse<String> res = send(HttpRequest.newBuilder()
                .uri(URI.create(requireBaseUrl() + "/auth/v1/admin/users"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)));

        if (res.statusCode() == 422 || res.statusCode() == 409) {
            // A login exists but no app_users row points at it.
            throw ApiException.invalidField("email",
                    "A Supabase login already exists for this email. Remove it, or ask that person to sign in.");
        }
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            LOG.errorf("Supabase admin create failed: HTTP %d %s", res.statusCode(), res.body());
            throw new ApiException(jakarta.ws.rs.core.Response.Status.BAD_GATEWAY, "SUPABASE_ERROR",
                    "Could not create the login in Supabase. Try again, or add the user in the Supabase dashboard.",
                    null);
        }

        try {
            JsonNode node = json.readTree(res.body());
            String id = node.path("id").asText(null);
            if (id == null || id.isBlank()) {
                throw new IllegalStateException("no id in response");
            }
            return UUID.fromString(id);
        } catch (Exception e) {
            LOG.error("Supabase admin create returned an unreadable body", e);
            throw new ApiException(jakarta.ws.rs.core.Response.Status.BAD_GATEWAY, "SUPABASE_ERROR",
                    "Supabase returned an unexpected response while creating the login.", null);
        }
    }

    @Override
    public void updateAuthUserEmail(UUID id, String email) {
        String body;
        try {
            // email_confirm marks the new address verified, so the person can
            // sign in with it straight away rather than waiting on a
            // confirmation mail that would leave the old address active.
            body = json.writeValueAsString(java.util.Map.of(
                    "email", email,
                    "email_confirm", true));
        } catch (Exception e) {
            throw new IllegalStateException("Could not build the Supabase request", e);
        }

        HttpResponse<String> res = send(HttpRequest.newBuilder()
                .uri(URI.create(requireBaseUrl() + "/auth/v1/admin/users/" + id))
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)));

        if (res.statusCode() == 422 || res.statusCode() == 409) {
            throw ApiException.invalidField("email",
                    "Another Supabase login already uses this email.");
        }
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            LOG.errorf("Supabase admin email update failed: HTTP %d %s", res.statusCode(), res.body());
            throw new ApiException(jakarta.ws.rs.core.Response.Status.BAD_GATEWAY, "SUPABASE_ERROR",
                    "Could not update the login email in Supabase.", null);
        }
    }

    @Override
    public void deleteAuthUser(UUID id) {
        HttpResponse<String> res = send(HttpRequest.newBuilder()
                .uri(URI.create(requireBaseUrl() + "/auth/v1/admin/users/" + id))
                .DELETE());

        // 404 is fine: already gone is the desired end state.
        if (res.statusCode() != 404 && (res.statusCode() < 200 || res.statusCode() >= 300)) {
            LOG.errorf("Supabase admin delete failed: HTTP %d %s", res.statusCode(), res.body());
            throw new ApiException(jakarta.ws.rs.core.Response.Status.BAD_GATEWAY, "SUPABASE_ERROR",
                    "Removed nothing: the Supabase login could not be deleted.", null);
        }
    }

    private HttpResponse<String> send(HttpRequest.Builder builder) {
        String key = serviceRoleKey.orElseThrow(() -> new ApiException(
                jakarta.ws.rs.core.Response.Status.SERVICE_UNAVAILABLE, "NOT_CONFIGURED",
                "User management is not configured: SUPABASE_SERVICE_ROLE_KEY is missing.", null));
        HttpRequest request = builder
                .header("apikey", key)
                .header("Authorization", "Bearer " + key)
                .timeout(Duration.ofSeconds(15))
                .build();
        try {
            return http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ApiException(jakarta.ws.rs.core.Response.Status.BAD_GATEWAY, "SUPABASE_ERROR",
                    "Interrupted while contacting Supabase.", null);
        } catch (Exception e) {
            LOG.error("Supabase admin call failed", e);
            throw new ApiException(jakarta.ws.rs.core.Response.Status.BAD_GATEWAY, "SUPABASE_ERROR",
                    "Could not reach Supabase.", null);
        }
    }

    private String requireBaseUrl() {
        if (baseUrl.isBlank()) {
            throw new ApiException(jakarta.ws.rs.core.Response.Status.SERVICE_UNAVAILABLE, "NOT_CONFIGURED",
                    "User management is not configured: SUPABASE_URL is missing.", null);
        }
        return baseUrl;
    }
}
