import { getProjectBySlug, getRegistrationsForProject } from "@/lib/directus";
import { notFound } from "next/navigation";
import RegistrationsClient from "./client";

export const dynamic = "force-dynamic";

export default async function RegistrationsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectBySlug(projectId);
  if (!project) notFound();

  const registrations = await getRegistrationsForProject(Number(project.id));

  return (
    <RegistrationsClient
      registrations={registrations}
      projectName={project.name}
      projectId={projectId}
      directusProjectId={Number(project.id)}
    />
  );
}
