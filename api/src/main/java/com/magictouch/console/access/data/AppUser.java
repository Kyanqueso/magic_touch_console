package com.magictouch.console.access.data;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A staff login. {@code id} equals the Supabase auth user id once auth is wired. */
@Entity
@Table(name = "app_users")
public class AppUser extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "employee_no", length = 20)
    public String employeeNo;

    @Column(nullable = false, length = 255)
    public String email;

    @Column(name = "last_name", nullable = false, length = 80)
    public String lastName;

    @Column(name = "first_name", nullable = false, length = 80)
    public String firstName;

    @Column(length = 20)
    public String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    public UserRole role = UserRole.USER;

    @Column(name = "disabled_at")
    public OffsetDateTime disabledAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    public OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    public OffsetDateTime updatedAt;

    public boolean isDisabled() {
        return disabledAt != null;
    }
}
