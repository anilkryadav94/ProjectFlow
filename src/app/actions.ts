

"use server";

import { z } from "zod";
import type { Project, Role, ClientStatus } from "@/lib/data";
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
    application_number: z.string().nullable(),
    patent_number: z.string().nullable(),
    country: z.string().nullable(),
    status: z.string().nullable(),
    notes: z.string().nullable(),
});

const updateProjectSchema = z.object({
  id: z.string(),
  ref_number: z.string().nullable(),
  client_name: z.string(),
  process: z.enum(["Patent", "TM", "IDS", "Project"]),
  subject_line: z.string(),
  application_number: z.string().nullable(),
  patent_number: z.string().nullable(),
  received_date: z.string(),
  allocation_date: z.string(),
  processor: z.string(),
  qa: z.string(),
  case_manager: z.string(),
  processing_status: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]),
  qa_status: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]),
  rework_reason: z.string().nullable(),
  client_comments: z.string().nullable(),
  clientquery_status: z.enum(["Approved", "Clarification Required"]).nullable(),
  entries: z.array(projectEntrySchema).optional(),
   // Adding all new fields to be safe
  sender: z.string().nullable(),
  country: z.string().nullable(),
  document_type: z.string().nullable(),
  action_taken: z.string().nullable(),
  renewal_agent: z.string().nullable(),
  client_query_description: z.string().nullable(),
  client_error_description: z.string().nullable(),
  qa_remark: z.string().nullable(),
  error: z.string().nullable(),
  email_renaming: z.string().nullable(),
  email_forwarded: z.string().nullable(),
  reportout_date: z.string().nullable(),
  manager_name: z.string().nullable(),
  workflowStatus: z.string(), // Keep it simple for validation
});


export async function updateProject(data: Partial<Project>, submitAction?: 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'save' | 'client_submit'): Promise<{success: boolean, project?: Project}> {
    const validatedData = updateProjectSchema.partial().parse(data);
    const projectIndex = projects.findIndex(p => p.id === validatedData.id);
    if (projectIndex === -1) {
        return { success: false };
    }

    const updatedProject = { ...projects[projectIndex], ...validatedData };
    
    // Handle status transitions based on action
    if (submitAction === 'submit_for_qa') {
      updatedProject.workflowStatus = 'With QA';
      updatedProject.processing_date = new Date().toISOString().split('T')[0];
    } else if (submitAction === 'submit_qa') {
      updatedProject.workflowStatus = 'Completed';
      updatedProject.qa_date = new Date().toISOString().split('T')[0];
    } else if (submitAction === 'send_rework') {
      updatedProject.workflowStatus = 'With Processor';
      updatedProject.processing_status = 'Re-Work';
    } else if (submitAction === 'client_submit') {
      updatedProject.workflowStatus = 'With QA';
      updatedProject.qa_status = 'Pending'; // Reset QA status so they know client responded
    }


    projects[projectIndex] = updatedProject as Project;

    revalidatePath('/');
    revalidatePath(`/task/${validatedData.id}`);
    
    return { success: true, project: updatedProject as Project };
}

const fieldsToCopy = z.enum([
  'subject_line',
  'client_name',
  'process',
  'processor',
  'qa',
  'case_manager',
  'received_date',
  'allocation_date',
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

  const numericIds = projects.map(p => parseInt(p.id.replace('PF', ''), 10)).filter(n => !isNaN(n));
  let lastIdNumber = numericIds.length > 0 ? Math.max(...numericIds) : 0;


  for (let i = 0; i < count; i++) {
    lastIdNumber++;
    const newId = `PF${String(lastIdNumber).padStart(6, '0')}`;

    const newProject: Project = {
        // Default values
        id: newId,
        ref_number: '', // Manual entry
        application_number: null,
        patent_number: null,
        workflowStatus: 'With Processor',
        processing_status: 'Pending',
        qa_status: 'Pending',
        processing_date: null,
        qa_date: null,
        rework_reason: null,
        client_comments: null,
        clientquery_status: null,
        entries: [],
        
        // Potentially copied values
        subject_line: '',
        client_name: '',
        process: 'Patent',
        processor: '',
        qa: '',
        case_manager: '',
        received_date: new Date().toISOString().split('T')[0],
        allocation_date: new Date().toISOString().split('T')[0],

        // Other new fields with default null
        sender: null,
        country: null,
        document_type: null,
        action_taken: null,
        renewal_agent: null,
        client_query_description: null,
        client_error_description: null,
        qa_remark: null,
        error: null,
        email_renaming: null,
        email_forwarded: null,
        reportout_date: null,
        manager_name: null,
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

    