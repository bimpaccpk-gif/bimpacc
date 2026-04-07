import { HierarchyType, HierarchyConfig } from '@/types';

export const HIERARCHY_CONFIGS: Record<HierarchyType, HierarchyConfig> = {
  1: {
    type: 1,
    name: "Full Course Structure",
    description: "Course → Semester → Subject → Lesson",
    hasSemesters: true,
    hasSubjects: true,
    hasLessons: true,
    entityNames: {
      level1: "Course",
      level2: "Semester",
      level3: "Subject",
    }
  },
  2: {
    type: 2,
    name: "Standard Course",
    description: "Course → Subject → Lesson",
    hasSemesters: false,
    hasSubjects: true,
    hasLessons: true,
    entityNames: {
      level1: "Course",
      level2: "Subject",
      level3: "Lesson",
    }
  },
  3: {
    type: 3,
    name: "Simple Course",
    description: "Course → Lesson",
    hasSemesters: false,
    hasSubjects: false,
    hasLessons: true,
    entityNames: {
      level1: "Course",
      level2: "Lesson",
      level3: "",
    }
  }
};

export function getHierarchyConfig(type: HierarchyType): HierarchyConfig {
  return HIERARCHY_CONFIGS[type];
}

export function getHierarchyOptions(): Array<{ type: HierarchyType; config: HierarchyConfig }> {
  return Object.entries(HIERARCHY_CONFIGS).map(([type, config]) => ({
    type: parseInt(type) as HierarchyType,
    config
  }));
}

export function getEntityName(type: HierarchyType, level: 1 | 2 | 3): string {
  const config = getHierarchyConfig(type);
  const levelKey = `level${level}` as keyof typeof config.entityNames;
  return config.entityNames[levelKey];
}
