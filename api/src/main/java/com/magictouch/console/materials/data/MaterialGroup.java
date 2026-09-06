package com.magictouch.console.materials.data;

import com.magictouch.console.common.entity.ReferenceGroup;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "material_groups")
public class MaterialGroup extends ReferenceGroup {
}
