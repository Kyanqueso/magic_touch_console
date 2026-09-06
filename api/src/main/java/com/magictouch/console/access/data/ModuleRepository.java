package com.magictouch.console.access.data;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ModuleRepository implements PanacheRepositoryBase<Module, String> {

    public List<Module> allOrdered() {
        return listAll(Sort.by("sortOrder").and("name"));
    }
}
