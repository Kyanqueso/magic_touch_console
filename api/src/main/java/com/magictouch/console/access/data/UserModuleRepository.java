package com.magictouch.console.access.data;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class UserModuleRepository implements PanacheRepositoryBase<UserModule, UserModule.Key> {

    public List<UserModule> forUser(UUID userId) {
        return list("userId", userId);
    }
}
