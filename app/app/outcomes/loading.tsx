import { WorkspaceListSkeleton } from "@/components/workspace-list-skeleton";

export default function OutcomesLoading() {
  return <WorkspaceListSkeleton label="outcome records" rows={4} />;
}
