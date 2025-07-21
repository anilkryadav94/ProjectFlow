
"use server";

import { z } from "zod";
import type { Project } from "@/lib/data";
import { projects } from "@/lib/data";

const formSchema = z.object({
  id: z.string().optional(),
  refNumber: z.string().min(1, "Reference number is required."),
  clientName: z.string().min(1, "Client name is required."),
  process: z.enum(["Patent", "TM", "IDS", "Project"]),
  applicationNumber: z.string().optional(),
  patentNumber: z.string().optional(),
  emailDate: z.date({ required_error: "Email date is required." }),
  allocationDate: z.date({ required_error: "Allocation date is required." }),
  processor: z.string().min(1, "Processor is required."),
  qa: z.string().min(1, "QA is required."),
  status: z.enum(["Pending", "Processing", "QA", "Complete", "On Hold"]),
  subject: z.string().optional(),
  actionTaken: z.string().optional(),
  documentName: z.string().optional(),
  submitAction: z.enum(['save', 'process', 'qa_complete'])
});

type ProjectFormValues = z.infer<typeof formSchema>;

function toISOString(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
}


export async function saveProject(data: ProjectFormValues): Promise<Project> {
    const validatedData = formSchema.parse(data);

    let projectToSave: Project;
    let existingProjectData: Partial<Project> = {};

    if (validatedData.id) {
        const project = projects.find(p => p.id === validatedData.id);
        if (project) {
            existingProjectData = project;
        }
    }

    let processingDate = existingProjectData?.processingDate || null;
    let qaDate = existingProjectData?.qaDate || null;
    let status = validatedData.status;

    if (validatedData.submitAction === 'process') {
        processingDate = new Date().toISOString().split('T')[0];
        status = 'QA';
    } else if (validatedData.submitAction === 'qa_complete') {
        qaDate = new Date().toISOString().split('T')[0];
        status = 'Complete';
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
        processingDate: processingDate,
        qaDate: qaDate,
        status,
    };
    
    delete (commonData as any).submitAction;


    if (validatedData.id) {
        const projectIndex = projects.findIndex(p => p.id === validatedData.id);
        if (projectIndex !== -1) {
            projects[projectIndex] = { ...projects[projectIndex], ...commonData };
            projectToSave = projects[projectIndex];
        } else {
            // This case should ideally not happen if an ID is present
            throw new Error("Project not found for update");
        }
    } else {
        const newId = (Math.max(...projects.map(p => parseInt(p.id, 10))) + 1).toString();
        projectToSave = {
            ...commonData,
            from: "new.user@example.com", // Dummy from
            id: newId,
        };
        projects.unshift(projectToSave);
    }
    
    return projectToSave;
}

const bulkUpdateSchema = z.object({
  projectIds: z.array(z.string()),
  field: z.enum(['processor', 'qa', 'status']),
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

    return { success: true, updatedProjects };
}
