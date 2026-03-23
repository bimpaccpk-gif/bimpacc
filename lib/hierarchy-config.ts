import { HierarchyType, HierarchyConfig } from '@/types';

export const HIERARCHY_CONFIGS: Record<HierarchyType, HierarchyConfig> = {
  1: {
    type: 1,
    name: "Full Course Structure",
    description: "Course → Subject → Lesson",
    hasSubjects: true,
    hasLessons: true,
    entityNames: {
      level1: "Course",
      level2: "Subject", 
      level3: "Lesson"
    }
  },
  2: {
    type: 2,
    name: "Subject-Lesson Structure", 
    description: "Subject → Lesson",
    hasSubjects: false,
    hasLessons: true,
    entityNames: {
      level1: "Subject",
      level2: "Lesson",
      level3: ""
    }
  },
  3: {
    type: 3,
    name: "Lesson Only",
    description: "Standalone Lessons",
    hasSubjects: false,
    hasLessons: true,
    entityNames: {
      level1: "Lesson",
      level2: "",
      level3: ""
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
