import { AccessControlPanel } from "@/components/admin/access-control/access-control-panel";

interface AccessPanelProps {
  userId: string;
}

/**
 * Server wrapper so the tab shell can compose the client-side content-access
 * manager exactly like every other (server-rendered) panel.
 */
function AccessPanel({ userId }: AccessPanelProps) {
  return <AccessControlPanel userId={userId} />;
}

export { AccessPanel };
export type { AccessPanelProps };
