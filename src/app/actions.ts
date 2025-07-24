
"use server";

import { z } from "zod";
import type { Project, Role, ClientStatus } from "@/lib/data";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, updateDoc, serverTimestamp, addDoc, getDoc, query, orderBy, limit } from "firebase/firestore";

const bulkUpdateSchema = z.object({
  projectIds: z.array(z.string()),
  field: z.enum(['processor', 'qa']),
  value: z.string().min(1, "New value cannot be empty."),
});

export async function bulkUpdateProjects(data: z.infer<typeof bulkUpdateSchema>): Promise<{ success: boolean; updatedProjects?: Project[] }> {
    const validatedData = bulkUpdateSchema.parse(data);
    const batch = writeBatch(db);

    validatedData.projectIds.forEach(id => {
        const projectRef = doc(db, 'projects', id);
        batch.update(projectRef, { [validatedData.field]: validatedData.value });
    });

    await batch.commit();

    revalidatePath('/');
    return { success: true };
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
  client_response_date: z.string().nullable(),
  workflowStatus: z.string(),
});


export async function updateProject(data: Partial<Project>, submitAction?: 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'save' | 'client_submit'): Promise<{success: boolean, project?: Project}> {
    const validatedData = updateProjectSchema.partial().parse(data);
    
    if (!validatedData.id) return { success: false };

    const projectRef = doc(db, 'projects', validatedData.id);

    const updatedProjectData = { ...validatedData };
    
    // Handle status transitions based on action
    if (submitAction === 'submit_for_qa') {
      updatedProjectData.workflowStatus = 'With QA';
      updatedProjectData.processing_date = new Date().toISOString().split('T')[0];
    } else if (submitAction === 'submit_qa') {
      updatedProjectData.workflowStatus = 'Completed';
      updatedProjectData.qa_date = new Date().toISOString().split('T')[0];
    } else if (submitAction === 'send_rework') {
      updatedProjectData.workflowStatus = 'With Processor';
      updatedProjectData.processing_status = 'Re-Work';
    } else if (submitAction === 'client_submit') {
      updatedProjectData.workflowStatus = 'With QA';
      updatedProjectData.qa_status = 'Pending';
      updatedProjectData.client_response_date = new Date().toISOString().split('T')[0];
    }

    await updateDoc(projectRef, updatedProjectData);

    revalidatePath('/');
    revalidatePath(`/task/${validatedData.id}`);
    
    const updatedDoc = await getDoc(projectRef);
    const finalProject = { id: updatedDoc.id, ...updatedDoc.data() } as Project;

    return { success: true, project: finalProject };
}

export async function addRows(
  projectDataToCopy: Partial<Project>,
  count: number
): Promise<{ success: boolean; addedCount?: number; error?: string }> {
  
  if (count <= 0) {
    return { success: false, error: "Count must be a positive number." };
  }

  const projectsCollection = collection(db, 'projects');
  
  try {
    let addedCount = 0;
    for (let i = 0; i < count; i++) {
        const newProject: Omit<Project, 'id'> = {
            ref_number: '',
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
            client_response_date: null,
            entries: [],
            subject_line: '',
            client_name: '',
            process: 'Patent',
            processor: '',
            qa: '',
            case_manager: '',
            received_date: new Date().toISOString().split('T')[0],
            allocation_date: new Date().toISOString().split('T')[0],
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

        // Apply copied data over the defaults
        Object.assign(newProject, projectDataToCopy);
        
        await addDoc(projectsCollection, newProject);
        addedCount++;
    }
    
    revalidatePath('/');
    return { success: true, addedCount: addedCount };
  } catch (error) {
    console.error("Error adding documents: ", error);
    if (error instanceof Error) {
        return { success: false, error: `Permission denied or server error: ${error.message}` };
    }
    return { success: false, error: "An unknown error occurred while adding rows."}
  }
}
