import { HierarchyType } from "@/types";
import { getHierarchyConfig } from "@/lib/hierarchy-config";
import { ChevronRight } from "lucide-react";

interface HierarchyIndicatorProps {
  hierarchyType: HierarchyType;
  compact?: boolean;
}

export function HierarchyIndicator({ hierarchyType, compact = false }: HierarchyIndicatorProps) {
  const config = getHierarchyConfig(hierarchyType);
  
  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="font-medium">{config.entityNames.level1}</span>
        {config.entityNames.level2 && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{config.entityNames.level2}</span>
          </>
        )}
        {config.entityNames.level3 && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{config.entityNames.level3}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
          1
        </div>
        <span className="text-sm font-medium">{config.entityNames.level1}</span>
      </div>
      
      {config.entityNames.level2 && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
              2
            </div>
            <span className="text-sm font-medium">{config.entityNames.level2}</span>
          </div>
        </>
      )}
      
      {config.entityNames.level3 && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
              3
            </div>
            <span className="text-sm font-medium">{config.entityNames.level3}</span>
          </div>
        </>
      )}
    </div>
  );
}
