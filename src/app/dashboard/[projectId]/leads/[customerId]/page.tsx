import { getProjectBySlug, getLeadProfile } from "@/lib/directus";
import { notFound } from "next/navigation";
import LeadProfileClient from "./client";

export const dynamic = "force-dynamic";

export default async function LeadProfilePage({ params }: { params: Promise<{ projectId: string; customerId: string }> }) {
  const { projectId, customerId } = await params;
  const project = await getProjectBySlug(projectId);
  if (!project) notFound();

  const profile = await getLeadProfile(Number(customerId), Number(project.id));
  if (!profile) notFound();

  return <LeadProfileClient profile={profile} projectId={projectId} projectName={project.name} />;
}
