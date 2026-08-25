"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface DetailTab {
  id: string;
  label: React.ReactNode;
  /**
   * Already-rendered content for the tab body — typically a server-rendered
   * panel element passed down from the page. The shell never touches it, so
   * panels stay server components.
   */
  content: React.ReactNode;
}

interface DetailTabsProps {
  tabs: DetailTab[];
  /** Tab id selected initially. Defaults to the first tab. */
  defaultValue?: string;
  className?: string;
}

/**
 * Client tab shell for the user detail page. It only owns which panel is
 * visible — every panel arrives as a pre-rendered React node, keeping all data
 * fetching and markup on the server (RSC-safe composition).
 */
function DetailTabs({ tabs, defaultValue, className }: DetailTabsProps) {
  const initialTabId = defaultValue ?? tabs[0]?.id ?? "";

  return (
    <Tabs defaultValue={initialTabId} className={cn("flex flex-col gap-4", className)}>
      <TabsList className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto sm:w-fit">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-0 flex flex-col gap-6">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export { DetailTabs };
export type { DetailTab, DetailTabsProps };
