package com.magictouch.console;

import io.smallrye.jwt.algorithm.SignatureAlgorithm;
import io.smallrye.jwt.build.Jwt;
import io.smallrye.jwt.build.JwtClaimsBuilder;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Mints real Supabase-shaped ES256 tokens, signed with a local EC key the app
 * verifies against. Not mocks: signature, issuer, audience and expiry are checked.
 */
public final class TestTokens {

    // Loaded by hand: sign(String) assumes an RSA key and returns null for an EC one.
    private static final PrivateKey SIGNING_KEY = loadSigningKey();

    private static PrivateKey loadSigningKey() {
        try (InputStream in = TestTokens.class.getClassLoader()
                .getResourceAsStream("test-jwt-private-key.pem")) {
            if (in == null) {
                throw new IllegalStateException("test-jwt-private-key.pem missing from the test classpath");
            }
            String der = new String(in.readAllBytes(), StandardCharsets.UTF_8)
                    .replaceAll("-----[A-Z ]+-----", "")
                    .replaceAll("\\s", "");
            return KeyFactory.getInstance("EC")
                    .generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(der)));
        } catch (Exception e) {
            throw new IllegalStateException("Could not load the EC test signing key", e);
        }
    }

    private static String signEs256(JwtClaimsBuilder claims) {
        return claims.jws().algorithm(SignatureAlgorithm.ES256).sign(SIGNING_KEY);
    }

    /** Must match %test.mp.jwt.verify.issuer. */
    public static final String ISSUER = "https://test.supabase.co/auth/v1";

    private TestTokens() {
    }

    /** A valid token for a brand-new random user id. */
    public static String valid() {
        return forUser(UUID.randomUUID());
    }

    /** A valid token whose {@code sub} is the given app_users id. */
    public static String forUser(UUID userId) {
        return signEs256(base(userId));
    }

    /** Ready-to-use {@code Authorization} header value. */
    public static String bearer(UUID userId) {
        return "Bearer " + forUser(userId);
    }

    public static String bearer() {
        return "Bearer " + valid();
    }

    /** Signed correctly but already expired — must be rejected. */
    public static String expired() {
        return signEs256(base(UUID.randomUUID())
                .issuedAt(Instant.now().minus(Duration.ofHours(2)))
                .expiresAt(Instant.now().minus(Duration.ofHours(1))));
    }

    /** Wrong key, and HS256 - so this also covers algorithm confusion. */
    public static String wrongSignature() {
        return base(UUID.randomUUID())
                .signWithSecret("a-completely-different-secret-key-0123456789");
    }

    /** Correct signature, wrong issuer — must be rejected. */
    public static String wrongIssuer() {
        return signEs256(base(UUID.randomUUID())
                .issuer("https://evil.example.com/auth/v1"));
    }

    private static JwtClaimsBuilder base(UUID userId) {
        return Jwt.claims()
                .issuer(ISSUER)
                .audience("authenticated")
                .subject(userId.toString())
                .claim("email", "test-" + userId + "@example.com")
                .claim("role", "authenticated")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plus(Duration.ofHours(1)));
    }
}
