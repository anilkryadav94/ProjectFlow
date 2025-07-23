

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

const projectEntrySchema = z.object({
    id: z.string(),
    applicationNumber: z.string().nullable(),
    patentNumber: z.string().nullable(),
    country: z.string().nullable(),
    status: z.string().nullable(),
    notes: z.string().nullable(),
});

const updateProjectSchema = z.object({
  id: z.string(),
  refNumber: z.string(),
  clientName: z.string(),
  process: z.enum(["Patent", "TM", "IDS", "Project"]),
  subject: z.string(),
  applicationNumber: z.string().nullable(),
  patentNumber: z.string().nullable(),
  emailDate: z.string(),
  allocationDate: z.string(),
  processor: z.string(),
  qa: z.string(),
  caseManager: z.string(),
  processorStatus: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]),
  qaStatus: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]),
  reworkReason: z.string().nullable(),
  entries: z.array(projectEntrySchema).optional(),
});


export async function updateProject(data: Partial<Project>, submitAction?: 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'save'): Promise<{success: boolean, project?: Project}> {
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
    }


    projects[projectIndex] = updatedProject;

    revalidatePath('/');
    revalidatePath(`/task/${validatedData.id}`);
    
    return { success: true, project: updatedProject };
}

const fieldsToCopy = z.enum([
  'subject',
  'clientName',
  'process',
  'processor',
  'qa',
  'caseManager',
  'emailDate',
  'allocationDate',
]);

type FieldToCopyId = z.infer<typeof fieldsToCopy>;

export async function addRows(
  sourceProjectId: string,
  fieldsToCopy: FieldToCopyId[],
  count: number
): Promise<{ success: boolean; addedCount?: number; error?: string }> {
  
  const sourceProject = projects.find(p => p.id === sourceProjectId);
  if (!sourceProject) {
    return { success: false, error: "Source project not found." };
  }

  if (count <= 0) {
    return { success: false, error: "Count must be a positive number."}
  }

  let lastRefNumber = parseInt(projects.map(p => p.refNumber.replace('REF', '')).sort((a,b) => parseInt(b) - parseInt(a))[0]);

  for (let i = 0; i < count; i++) {
    lastRefNumber++;
    const newProject: Project = {
        // Default values
        id: `proj_${Date.now()}_${i}`,
        refNumber: `REF${String(lastRefNumber).padStart(3, '0')}`,
        applicationNumber: null,
        patentNumber: null,
        workflowStatus: 'With Processor',
        processorStatus: 'Pending',
        qaStatus: 'Pending',
        processingDate: null,
        qaDate: null,
        reworkReason: null,
        entries: [],
        
        // Potentially copied values
        subject: '',
        clientName: '',
        process: 'Patent',
        processor: '',
        qa: '',
        caseManager: '',
        emailDate: new Date().toISOString().split('T')[0],
        allocationDate: new Date().toISOString().split('T')[0],
    };

    fieldsToCopy.forEach(field => {
      if (sourceProject.hasOwnProperty(field)) {
        (newProject as any)[field] = sourceProject[field as keyof Project];
      }
    });

    projects.unshift(newProject);
  }

  revalidatePath('/');
  return { success: true, addedCount: count };
}
