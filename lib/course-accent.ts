import type { HierarchyType } from "@/types";

/**
 * Static per-hierarchy accent styling for course cards.
 *
 * Every value is a COMPLETE literal class string. Tailwind's compiler scans
 * source files for whole class names — anything assembled at runtime with
 * template interpolation (`` ring-[${color}] ``, `` group-hover:${text} ``)
 * never exists at build time and silently drops out of the stylesheet. Keep
 * these strings literal and pass them through untouched.
 *
 * Accents reuse the validated chart token ramp from docs/design-tokens.md
 * (chart-1 indigo 264 / chart-4 violet 305 / chart-3 amber 80) instead of raw
 * palette classes, so light + dark parity holds for free.
 */
export interface CourseAccent {
  /** Vertical gradient stops for the card's left edge bar (`bg-gradient-to-b …`). */
  edgeGradient: string;
  /** Icon tile surface: background + border in both modes. */
  iconTile: string;
  /** Icon glyph color inside the tile. */
  iconColor: string;
  /** Chip/pill background + text (batch badge, setup chip, stat rows). */
  chip: string;
  /** Chip ring color. */
  chipRing: string;
  /** Card title color on row hover — variant prefixes included. */
  titleHover: string;
  /** Card border highlight on hover. */
  hoverBorder: string;
  /** Drag-handle hover surface. */
  dragHandleHover: string;
  /** Drag-handle glyph color. */
  dragHandleIcon: string;
  /** Ring applied to the card while it is being dragged. */
  draggingRing: string;
  /** Hierarchy group heading text color. */
  headingText: string;
}

export const COURSE_ACCENTS: Record<HierarchyType, CourseAccent> = {
  1: {
    edgeGradient: "from-chart-1 to-chart-1/60",
    iconTile:
      "bg-chart-1/10 border-chart-1/25 dark:bg-chart-1/15 dark:border-chart-1/30",
    iconColor: "text-chart-1",
    chip: "bg-chart-1/10 text-chart-1 dark:bg-chart-1/20",
    chipRing: "ring-chart-1/30 dark:ring-chart-1/40",
    titleHover: "group-hover:text-chart-1 dark:group-hover:text-chart-1",
    hoverBorder: "hover:border-chart-1/40 dark:hover:border-chart-1/40",
    dragHandleHover: "hover:bg-chart-1/10 dark:hover:bg-chart-1/15",
    dragHandleIcon: "text-chart-1",
    draggingRing: "ring-chart-1/60 dark:ring-chart-1/50",
    headingText: "text-chart-1 dark:text-chart-1",
  },
  2: {
    edgeGradient: "from-chart-4 to-chart-4/60",
    iconTile:
      "bg-chart-4/10 border-chart-4/25 dark:bg-chart-4/15 dark:border-chart-4/30",
    iconColor: "text-chart-4",
    chip: "bg-chart-4/10 text-chart-4 dark:bg-chart-4/20",
    chipRing: "ring-chart-4/30 dark:ring-chart-4/40",
    titleHover: "group-hover:text-chart-4 dark:group-hover:text-chart-4",
    hoverBorder: "hover:border-chart-4/40 dark:hover:border-chart-4/40",
    dragHandleHover: "hover:bg-chart-4/10 dark:hover:bg-chart-4/15",
    dragHandleIcon: "text-chart-4",
    draggingRing: "ring-chart-4/60 dark:ring-chart-4/50",
    headingText: "text-chart-4 dark:text-chart-4",
  },
  3: {
    edgeGradient: "from-chart-3 to-chart-3/60",
    iconTile:
      "bg-chart-3/15 border-chart-3/30 dark:bg-chart-3/20 dark:border-chart-3/35",
    iconColor: "text-chart-3 dark:text-chart-3",
    chip: "bg-chart-3/15 text-warning dark:bg-chart-3/25 dark:text-warning",
    chipRing: "ring-chart-3/40 dark:ring-chart-3/45",
    titleHover: "group-hover:text-chart-3 dark:group-hover:text-chart-3",
    hoverBorder: "hover:border-chart-3/45 dark:hover:border-chart-3/45",
    dragHandleHover: "hover:bg-chart-3/15 dark:hover:bg-chart-3/20",
    dragHandleIcon: "text-chart-3 dark:text-chart-3",
    draggingRing: "ring-chart-3/65 dark:ring-chart-3/55",
    headingText: "text-chart-3 dark:text-chart-3",
  },
};

/**
 * Accent set for a hierarchy type. Falls back to the type-1 accent so unknown
 * values coming back from the database still render a coherent card.
 */
export function getCourseAccent(hierarchyType: number | HierarchyType): CourseAccent {
  const key = hierarchyType as HierarchyType;
  return COURSE_ACCENTS[key] ?? COURSE_ACCENTS[1];
}
