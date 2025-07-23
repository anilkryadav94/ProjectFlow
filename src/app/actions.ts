"use server";

import { z } from "zod";
import type { Project, Role } from "@/lib/data";
import { projects } from "@/lib/data";
import { revalidatePath } from "next/cache";

const bulkUpdateSchema = z.object({
  projectIds: z.array(z.string()),
  field: z.enum(['processor', 'qa']),
  value: z.string().min(1, "New value cannot be empty."),
});

export async function bulkUpdateProjects(data: z.infer<typeof bulkUpdateSchema>): Promise<{ success: boolean; updatedProjects: Project[] }> {
    const validatedData = bulkUpdateSchema.parse(data);
    const updatedProjects: Project[] = [];

    validatedData.projectIds.forEach(id => {
        const projectIndex = projects.findIndex(p => p.id === id);
        if (projectIndex !== -1) {
            const updatedProject = {
                ...projects[projectIndex],
                [validatedData.field]: validatedData.value,
            };
            projects[projectIndex] = updatedProject;
            updatedProjects.push(updatedProject);
        }
    });

    revalidatePath('/');

    return { success: true, updatedProjects };
}

const updateProjectSchema = z.object({
  id: z.string(),
  processor: z.string().optional(),
  qa: z.string().optional(),
});


export async function updateProject(data: Partial<Project>): Promise<{success: boolean, project?: Project}> {
    const validatedData = updateProjectSchema.parse(data);
    const projectIndex = projects.findIndex(p => p.id === validatedData.id);
    if (projectIndex === -1) {
        return { success: false };
    }

    const updatedProject = {
        ...projects[projectIndex],
        ...validatedData
    };
    projects[projectIndex] = updatedProject;

    revalidatePath('/');
    
    return { success: true, project: updatedProject };
}
