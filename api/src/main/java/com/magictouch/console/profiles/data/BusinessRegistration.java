package com.magictouch.console.profiles.data;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "business_registrations")
public class BusinessRegistration extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "corporate_profile_id", nullable = false)
    public CorporateProfile profile;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 3)
    public RegistrationBody body;

    @Column(name = "registration_no", nullable = false, length = 40)
    public String registrationNo;

    @Column(name = "registered_at")
    public LocalDate registeredAt;

    @Column(name = "expires_at")
    public LocalDate expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    public OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;

    /** Drives the frontend's Active badge. */
    public boolean isActive() {
        return expiresAt == null || !expiresAt.isBefore(LocalDate.now());
    }
}
