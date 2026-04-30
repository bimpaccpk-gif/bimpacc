"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen, BookOpen, GraduationCap, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AccessStatusBadge, AccessEffectiveIndicator } from "./access-status-badge";
import type { AccessTreeNode } from "@/app/actions/access-control";
import {
  grantAccess,
  revokeAccess,
  grantSemesterAccess,
  revokeSemesterAccess,
  grantSubjectAccess,
  revokeSubjectAccess,
} from "@/app/actions/access-control";
import { toast } from "sonner";

interface CourseAccessTreeProps {
  tree: AccessTreeNode;
  userId: string;
  hierarchyType: number;
  onAccessChange?: () => void;
}

export function CourseAccessTree({ tree, userId, hierarchyType, onAccessChange }: CourseAccessTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([tree.id]));
  const [loading, setLoading] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGrant = async (
    node: AccessTreeNode,
    cascade: boolean = false
  ) => {
    setLoading(node.id);
    try {
      let result;
      if (cascade) {
        if (node.type === "course") {
          const { grantAccessCascade } = await import("@/app/actions/access-control");
          result = await grantAccessCascade(userId, node.id, hierarchyType as 1 | 2 | 3);
        } else if (node.type === "semester") {
          result = await grantSemesterAccess(userId, node.id);
        } else if (node.type === "subject") {
          result = await grantSubjectAccess(userId, node.id);
        } else {
          result = await grantAccess(userId, node.type, node.id);
        }
      } else {
        result = await grantAccess(userId, node.type, node.id);
      }

      if (result.success) {
        toast.success(`Access granted to "${node.title}"`);
        onAccessChange?.();
      } else {
        toast.error(result.error || "Failed to grant access");
      }
    } finally {
      setLoading(null);
    }
  };

  const handleRevoke = async (
    node: AccessTreeNode,
    cascade: boolean = false
  ) => {
    setLoading(node.id);
    try {
      let result;
      if (cascade) {
        if (node.type === "course") {
          const { revokeAccessCascade } = await import("@/app/actions/access-control");
          result = await revokeAccessCascade(userId, node.id, hierarchyType as 1 | 2 | 3);
        } else if (node.type === "semester") {
          result = await revokeSemesterAccess(userId, node.id);
        } else if (node.type === "subject") {
          result = await revokeSubjectAccess(userId, node.id);
        } else {
          result = await revokeAccess(userId, node.type, node.id);
        }
      } else {
        result = await revokeAccess(userId, node.type, node.id);
      }

      if (result.success) {
        toast.success(`Access revoked for "${node.title}"`);
        onAccessChange?.();
      } else {
        toast.error(result.error || "Failed to revoke access");
      }
    } finally {
      setLoading(null);
    }
  };

  const countAccessibleItems = (node: AccessTreeNode): { accessible: number; total: number } => {
    if (!node.children || node.children.length === 0) {
      return {
        accessible: node.effectiveStatus === "accessible" ? 1 : 0,
        total: 1,
      };
    }

    let accessible = 0;
    let total = 0;

    for (const child of node.children) {
      const childCount = countAccessibleItems(child);
      accessible += childCount.accessible;
      total += childCount.total;
    }

    return { accessible, total };
  };

  const getNodeIcon = (node: AccessTreeNode) => {
    if (node.type === "course") {
      return node.effectiveStatus !== "blocked" && node.effectiveStatus !== "inherited" ? (
        <FolderOpen className="size-4 text-emerald-600" />
      ) : (
        <Folder className="size-4 text-gray-400" />
      );
    }
    if (node.type === "semester") {
      return <GraduationCap className="size-4 text-violet-600" />;
    }
    if (node.type === "subject") {
      return <BookOpen className="size-4 text-blue-600" />;
    }
    return <FileText className="size-4 text-amber-600" />;
  };

  const renderNode = (node: AccessTreeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isLoading = loading === node.id;
    const counts = countAccessibleItems(node);

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group",
            level > 0 && "ml-6",
            node.effectiveStatus === "blocked" && "bg-red-50/50 dark:bg-red-950/20",
            node.effectiveStatus === "inherited" && "bg-amber-50/50 dark:bg-amber-950/20"
          )}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="p-0.5 hover:bg-muted rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {getNodeIcon(node)}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{node.title}</span>
              {node.globalPause && (
                <span aria-label="Globally paused">
                  <Lock className="size-3 text-muted-foreground" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <AccessStatusBadge
                accessLevel={node.accessLevel}
                effectiveStatus={node.effectiveStatus}
                showLabel={false}
              />
              <AccessEffectiveIndicator status={node.effectiveStatus} />
              {hasChildren && (
                <span className="text-xs text-muted-foreground">
                  ({counts.accessible}/{counts.total} accessible)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.effectiveStatus !== "accessible" ? (
              <Button
                size="xs"
                variant="ghost"
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                onClick={() => handleGrant(node, false)}
                disabled={isLoading}
              >
                Grant
              </Button>
            ) : (
              <Button
                size="xs"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => handleRevoke(node, false)}
                disabled={isLoading}
              >
                Block
              </Button>
            )}

            {hasChildren && (
              <Button
                size="xs"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={() =>
                  node.effectiveStatus === "accessible"
                    ? handleRevoke(node, true)
                    : handleGrant(node, true)
                }
                disabled={isLoading}
                title={node.effectiveStatus === "accessible" ? "Block all including children" : "Grant all including children"}
              >
                {node.effectiveStatus === "accessible" ? "Block All" : "Grant All"}
              </Button>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b">
        <FolderOpen className="size-5 text-emerald-600" />
        <div className="flex-1">
          <h3 className="font-semibold">{tree.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <AccessStatusBadge
              accessLevel={tree.accessLevel}
              effectiveStatus={tree.effectiveStatus}
            />
            {tree.globalPause && (
              <span className="text-xs text-amber-600 dark:text-amber-500">
                ⚠ Course is globally paused
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {tree.effectiveStatus !== "accessible" ? (
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
              onClick={() => handleGrant(tree, true)}
              disabled={loading === tree.id}
            >
              Grant Full Access
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
              onClick={() => handleRevoke(tree, true)}
              disabled={loading === tree.id}
            >
              Revoke Full Access
            </Button>
          )}
        </div>
      </div>

      <div>{renderNode(tree)}</div>
    </div>
  );
}