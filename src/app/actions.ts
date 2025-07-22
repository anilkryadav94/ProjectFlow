
"use server";

import { z } from "zod";
import type { Project, Role, ProjectEntry } from "@/lib/data";
import { projects } from "@/lib/data";
import { redirect } from "next/navigation";
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

const projectEntrySchema = z.object({
    id: z.string(),
    column1: z.string(),
    column2: z.string(),
    notes: z.string(),
});

const projectSchema = z.object({
  id: z.string(),
  refNumber: z.string().min(1, "Ref Number is required."),
  clientName: z.string().min(1, "Client Name is required."),
  process: z.enum(["Patent", "TM", "IDS", "Project"]),
  applicationNumber: z.string().nullable(),
  patentNumber: z.string().nullable(),
  emailDate: z.string().min(1, "Email Date is required."),
  allocationDate: z.string().min(1, "Allocation Date is required."),
  processor: z.string().min(1, "Processor is required."),
  qa: z.string().min(1, "QA is required."),
  processorStatus: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]),
  qaStatus: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]),
  reworkReason: z.string().nullable(),
  subject: z.string().min(1, "Subject is required."),
  processingDate: z.string().nullable(),
  qaDate: z.string().nullable(),
  workflowStatus: z.enum(['Pending Allocation', 'With Processor', 'With QA', 'Completed']),
  entries: z.array(projectEntrySchema).optional(),
});


export async function saveProject(
  data: z.infer<typeof projectSchema>, 
  submitAction: 'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework',
  nextProjectId?: string | null,
  filteredIds?: string | undefined,
  activeRole?: Role | undefined,
): Promise<Project | void> {
    
    const validatedData = projectSchema.parse(data);

    let savedProject: Project;
    const projectIndex = projects.findIndex(p => p.id === validatedData.id);

    if (projectIndex !== -1) {
        // Update existing project
        const project = projects[projectIndex];
        
        const updatedProject: Project = {
            ...project,
            ...validatedData,
        };

        if (submitAction === 'submit_for_qa') {
            updatedProject.workflowStatus = 'With QA';
            updatedProject.processingDate = new Date().toISOString().split('T')[0];
        } else if (submitAction === 'submit_qa') {
            updatedProject.workflowStatus = 'Completed';
            updatedProject.qaDate = new Date().toISOString().split('T')[0];
        } else if (submitAction === 'send_rework') {
            updatedProject.workflowStatus = 'With Processor';
            updatedProject.processorStatus = 'Re-Work';
        }

        projects[projectIndex] = updatedProject;
        savedProject = updatedProject;
    } else {
       // This part is for creating new projects
        const newId = (Math.max(...projects.map(p => parseInt(p.id, 10))) + 1).toString();
        const newProject: Project = {
            ...validatedData,
            id: newId,
        };
        projects.unshift(newProject);
        savedProject = newProject;
    }

    revalidatePath('/');
    revalidatePath(`/task/${savedProject.id}`);
}

    