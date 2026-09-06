package com.magictouch.console.access.data;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import org.hibernate.annotations.UpdateTimestamp;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/** Whether a module is switched on for a corporate profile. Missing row = disabled. */
@Entity
@Table(name = "corporate_profile_modules")
@IdClass(CorporateProfileModule.Key.class)
public class CorporateProfileModule extends PanacheEntityBase {

    @Id
    @Column(name = "corporate_profile_id")
    public Long corporateProfileId;

    @Id
    @Column(name = "module_key", length = 60)
    public String moduleKey;

    @Column(name = "is_enabled", nullable = false)
    public boolean enabled;

    @Column(name = "updated_by")
    public UUID updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;

    public static class Key implements Serializable {
        public Long corporateProfileId;
        public String moduleKey;

        public Key() {
        }

        public Key(Long corporateProfileId, String moduleKey) {
            this.corporateProfileId = corporateProfileId;
            this.moduleKey = moduleKey;
        }

        @Override
        public boolean equals(Object o) {
            if (!(o instanceof Key k)) {
                return false;
            }
            return Objects.equals(corporateProfileId, k.corporateProfileId)
                    && Objects.equals(moduleKey, k.moduleKey);
        }

        @Override
        public int hashCode() {
            return Objects.hash(corporateProfileId, moduleKey);
        }
    }
}
