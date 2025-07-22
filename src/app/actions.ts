
"use server";

import { z } from "zod";
import type { Project } from "@/lib/data";
import { projects } from "@/lib/data";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const formSchema = z.object({
  id: z.string().optional(),
  refNumber: z.string().min(1, "Reference number is required."),
  clientName: z.string().min(1, "Client name is required."),
  process: z.enum(['Patent', 'TM', 'IDS', 'Project']),
  applicationNumber: z.string().optional(),
  patentNumber: z.string().optional(),
  emailDate: z.date({ required_error: "Email date is required." }),
  allocationDate: z.date({ required_error: "Allocation date is required." }),
  processor: z.string().min(1, "Processor is required."),
  qa: z.string().min(1, "QA is required."),
  processorStatus: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]),
  qaStatus: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]),
  submitAction: z.enum(['save', 'submit_for_qa', 'submit_qa'])
});


type ProjectFormValues = z.infer<typeof formSchema>;

function toISOString(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
}

export async function saveProject(data: ProjectFormValues, nextProjectId?: string): Promise<Project | void> {
    const validatedData = formSchema.parse(data);
    const { id, submitAction, ...formData } = validatedData;

    const projectIndex = id ? projects.findIndex(p => p.id === id) : -1;
    const existingProject = projectIndex !== -1 ? projects[projectIndex] : null;

    let workflowStatus = existingProject?.workflowStatus || 'With Processor';
    let processingDate = existingProject?.processingDate || null;
    let qaDate = existingProject?.qaDate || null;
    let finalProcessorStatus = formData.processorStatus;
    let finalQaStatus = formData.qaStatus;

    switch(submitAction) {
        case 'submit_for_qa':
            workflowStatus = 'With QA';
            processingDate = new Date().toISOString().split('T')[0];
            finalProcessorStatus = 'Processed';
            finalQaStatus = 'Pending';
            break;
        case 'submit_qa':
            workflowStatus = 'Completed';
            qaDate = new Date().toISOString().split('T')[0];
            finalQaStatus = 'Complete';
            break;
        case 'save':
            // Keep statuses from form data
            break;
    }

    let savedProject: Project;

    if (existingProject) {
        // Update existing project
        const updatedProject: Project = {
            ...existingProject,
            ...formData,
            applicationNumber: formData.applicationNumber || null,
            patentNumber: formData.patentNumber || null,
            emailDate: toISOString(formData.emailDate)!,
            allocationDate: toISOString(formData.allocationDate)!,
            workflowStatus,
            processorStatus: finalProcessorStatus,
            qaStatus: finalQaStatus,
            processingDate,
            qaDate,
        };
        projects[projectIndex] = updatedProject;
        savedProject = updatedProject;
    } else {
        // Create new project
        const newId = (Math.max(...projects.map(p => parseInt(p.id, 10))) + 1).toString();
        const newProject: Project = {
            id: newId,
            ...formData,
            applicationNumber: formData.applicationNumber || null,
            patentNumber: formData.patentNumber || null,
            emailDate: toISOString(formData.emailDate)!,
            allocationDate: toISOString(formData.allocationDate)!,
            workflowStatus,
            processorStatus: finalProcessorStatus,
            qaStatus: finalQaStatus,
            processingDate,
            qaDate,
            subject: 'Newly Created Project', // Add default subject
            reworkReason: null,
        };
        projects.unshift(newProject);
        savedProject = newProject;
    }
    
    revalidatePath('/');
    revalidatePath(`/task/${savedProject.id}`);

    if (submitAction === 'save') {
      return savedProject;
    }
    
    if (nextProjectId) {
      redirect(`/task/${nextProjectId}`);
    } else {
      redirect('/');
    }
}


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

    