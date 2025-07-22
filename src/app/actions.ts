
"use server";

import { z } from "zod";
import type { Project } from "@/lib/data";
import { projects, processorSubmissionStatuses, qaSubmissionStatuses, processes } from "@/lib/data";
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
  subject: z.string().optional(),
  actionTaken: z.string().optional(),
  documentName: z.string().optional(),

  submitAction: z.enum(['save', 'submit_for_qa', 'submit_qa'])
}).superRefine((data, ctx) => {
    if (data.submitAction === 'submit_qa' && !qaSubmissionStatuses.includes(data.qaStatus)) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A valid submission status is required for QA.",
            path: ["qaStatus"],
        });
    }
});


type ProjectFormValues = z.infer<typeof formSchema>;

function toISOString(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
}


export async function saveProject(data: ProjectFormValues, nextProjectId?: string): Promise<Project | void> {
    const validatedData = formSchema.parse(data);

    let projectToSave: Project;
    let projectIndex = -1;

    if (validatedData.id) {
        projectIndex = projects.findIndex(p => p.id === validatedData.id);
    }

    if (projectIndex === -1 && validatedData.id) {
         throw new Error("Project not found for update");
    }
    
    const existingProjectData = projectIndex !== -1 ? projects[projectIndex] : {};
    
    let workflowStatus = existingProjectData?.workflowStatus || 'With Processor';
    let processingDate = existingProjectData?.processingDate || null;
    let qaDate = existingProjectData?.qaDate || null;
    let processorStatus = validatedData.processorStatus;
    let qaStatus = validatedData.qaStatus;

    switch(validatedData.submitAction) {
        case 'submit_for_qa':
            workflowStatus = 'With QA';
            processingDate = new Date().toISOString().split('T')[0];
            qaStatus = 'Pending';
            if (!processorSubmissionStatuses.includes(processorStatus)) {
                processorStatus = 'Processed';
            }
            break;
        case 'submit_qa':
            workflowStatus = 'Completed';
            qaDate = new Date().toISOString().split('T')[0];
            break;
        case 'save':
            // Statuses are taken directly from the form data
            break;
    }

    const commonData = {
        ...validatedData,
        applicationNumber: validatedData.applicationNumber || '',
        patentNumber: validatedData.patentNumber || '',
        subject: validatedData.subject || '',
        actionTaken: validatedData.actionTaken || '',
        documentName: validatedData.documentName || '',
        emailDate: toISOString(validatedData.emailDate)!,
        allocationDate: toISOString(validatedData.allocationDate)!,
        processingDate,
        qaDate,
        workflowStatus,
        processorStatus,
        qaStatus,
        reworkReason: '', // Keep field for data consistency, but logic is removed.
    };
    
    delete (commonData as any).submitAction;

    if (projectIndex !== -1) {
        projects[projectIndex] = { ...projects[projectIndex], ...commonData };
        projectToSave = projects[projectIndex];
    } else {
        const newId = (Math.max(...projects.map(p => parseInt(p.id, 10))) + 1).toString();
        projectToSave = {
            ...commonData,
            from: "new.user@example.com", 
            id: newId,
            country: 'USA',
        };
        projects.unshift(projectToSave);
    }
    
    revalidatePath('/');
    revalidatePath(`/task/${projectToSave.id}`);

    if (validatedData.submitAction === 'save') {
      return projectToSave;
    }
    
    if (validatedData.submitAction === 'submit_for_qa' || validatedData.submitAction === 'submit_qa') {
      if (nextProjectId) {
        redirect(`/task/${nextProjectId}`);
      } else {
        redirect('/');
      }
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
