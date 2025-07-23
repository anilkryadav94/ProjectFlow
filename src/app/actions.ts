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
  processorStatus: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]).optional(),
  qaStatus: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]).optional(),
  reworkReason: z.string().nullable().optional(),
});


export async function updateProject(data: Partial<Project>, submitAction?: 'submit_for_qa' | 'submit_qa' | 'send_rework'): Promise<{success: boolean, project?: Project}> {
    const validatedData = updateProjectSchema.parse(data);
    const projectIndex = projects.findIndex(p => p.id === validatedData.id);
    if (projectIndex === -1) {
        return { success: false };
    }

    const updatedProject = { ...projects[projectIndex], ...validatedData };
    
    // Handle status transitions based on action
    if (submitAction === 'submit_for_qa') {
      updatedProject.workflowStatus = 'With QA';
      updatedProject.processingDate = new Date().toISOString().split('T')[0];
    } else if (submitAction === 'submit_qa') {
      updatedProject.workflowStatus = 'Completed';
      updatedProject.qaDate = new Date().toISOString().split('T')[0];
    } else if (submitAction === 'send_rework') {
      updatedProject.workflowStatus = 'With Processor';
      updatedProject.processorStatus = 'Re-Work';
      // reworkReason is already part of validatedData
    }


    projects[projectIndex] = updatedProject;

    revalidatePath('/');
    revalidatePath(`/task/${validatedData.id}`);
    
    return { success: true, project: updatedProject };
}
