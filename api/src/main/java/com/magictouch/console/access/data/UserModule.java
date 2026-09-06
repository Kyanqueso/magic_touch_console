package com.magictouch.console.access.data;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import org.hibernate.annotations.UpdateTimestamp;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/** One user's access level for one module. Missing row = NO_ACCESS. */
@Entity
@Table(name = "user_modules")
@IdClass(UserModule.Key.class)
public class UserModule extends PanacheEntityBase {

    @Id
    @Column(name = "user_id")
    public UUID userId;

    @Id
    @Column(name = "module_key", length = 60)
    public String moduleKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    public AccessLevel access;

    @Column(name = "updated_by")
    public UUID updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;

    public static class Key implements Serializable {
        public UUID userId;
        public String moduleKey;

        public Key() {
        }

        public Key(UUID userId, String moduleKey) {
            this.userId = userId;
            this.moduleKey = moduleKey;
        }

        @Override
        public boolean equals(Object o) {
            if (!(o instanceof Key k)) {
                return false;
            }
            return Objects.equals(userId, k.userId) && Objects.equals(moduleKey, k.moduleKey);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, moduleKey);
        }
    }
}
