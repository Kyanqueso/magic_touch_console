package com.magictouch.console.common.entity;

import com.magictouch.console.common.security.CurrentUser;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

/**
 * Stamps {@code created_by} / {@code updated_by}. Timestamps are handled by the
 * Hibernate {@code @CreationTimestamp} / {@code @UpdateTimestamp} annotations.
 */
public class AuditListener {

    @PrePersist
    void onCreate(BaseEntity entity) {
        var actor = CurrentUser.id().orElse(null);
        entity.createdBy = actor;
        entity.updatedBy = actor;
    }

    @PreUpdate
    void onUpdate(BaseEntity entity) {
        CurrentUser.id().ifPresent(id -> entity.updatedBy = id);
    }
}
