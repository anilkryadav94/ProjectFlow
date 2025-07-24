
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

// This schema defines ONLY the fields that are allowed to be updated.
// It does NOT include `id` or `row_number`.
const updateProjectSchema = z.object({
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
  processing_date: z.string().nullable(),
  qa_date: z.string().nullable(),
});


export async function updateProject(data: Partial<Project>, submitAction?: 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'save' | 'client_submit'): Promise<{success: boolean, project?: Project}> {
    
    if (!data.id) return { success: false };
    const projectId = data.id;
    const projectRef = doc(db, 'projects', projectId);

    // Whitelist approach: only build an object with fields that are allowed to be updated.
    let dataToUpdate: { [key: string]: any } = {};

    // Handle status transitions and data based on action
    if (submitAction === 'client_submit') {
      dataToUpdate.workflowStatus = 'With QA';
      dataToUpdate.qa_status = 'Pending';
      dataToUpdate.clientquery_status = data.clientquery_status || null;
      dataToUpdate.client_comments = data.client_comments || null;
      dataToUpdate.client_response_date = new Date().toISOString().split('T')[0];
    } else {
       // For other roles, we can copy the entire data object for now, 
       // but critically remove the fields that should never be updated.
       dataToUpdate = { ...data };

        if (submitAction === 'submit_for_qa') {
            dataToUpdate.workflowStatus = 'With QA';
            dataToUpdate.processing_date = new Date().toISOString().split('T')[0];
        } else if (submitAction === 'submit_qa') {
            dataToUpdate.workflowStatus = 'Completed';
            dataToUpdate.qa_date = new Date().toISOString().split('T')[0];
        } else if (submitAction === 'send_rework') {
            dataToUpdate.workflowStatus = 'With Processor';
            dataToUpdate.processing_status = 'Re-Work';
        }
    }

    // CRITICAL: Ensure forbidden fields are never sent to Firestore, regardless of action.
    delete dataToUpdate.id;
    delete dataToUpdate.row_number;
    
    await updateDoc(projectRef, dataToUpdate);

    revalidatePath('/');
    revalidatePath(`/task/${projectId}`);
    
    const updatedDoc = await getDoc(projectRef);
    const finalProject = { id: updatedDoc.id, ...updatedDoc.data() } as Project;

    return { success: true, project: finalProject };
}
