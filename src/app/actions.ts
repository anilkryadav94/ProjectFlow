
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

// This is the "whitelist" of all fields that are allowed to be updated.
// We will use this to build a safe update object.
const updatableProjectFields = [
  'ref_number', 'client_name', 'process', 'subject_line', 'application_number',
  'patent_number', 'received_date', 'allocation_date', 'processor', 'qa',
  'case_manager', 'processing_status', 'qa_status', 'rework_reason',
  'client_comments', 'clientquery_status', 'sender', 'country', 'document_type',
  'action_taken', 'renewal_agent', 'client_query_description', 'client_error_description',
  'qa_remark', 'error', 'email_renaming', 'email_forwarded', 'reportout_date',
  'manager_name', 'client_response_date', 'workflowStatus'
] as const;


export async function updateProject(
    projectId: string, 
    clientData: Partial<Project>, 
    submitAction?: 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'save' | 'client_submit'
): Promise<{success: boolean, project?: Project}> {
    
    if (!projectId) return { success: false };
    const projectRef = doc(db, 'projects', projectId);

    const dataToUpdate: { [key: string]: any } = {};
    
    // Safely build the update object using the whitelist.
    for (const key of updatableProjectFields) {
        if (Object.prototype.hasOwnProperty.call(clientData, key)) {
            const typedKey = key as keyof typeof clientData;
            // Only add the field if it's not undefined in the source data
            if (clientData[typedKey] !== undefined) {
                 dataToUpdate[typedKey] = clientData[typedKey];
            }
        }
    }

    // Handle status transitions and automatic date stamping based on action
    if (submitAction === 'client_submit') {
      dataToUpdate.workflowStatus = 'With QA';
      dataToUpdate.qa_status = 'Pending';
      dataToUpdate.client_response_date = new Date().toISOString().split('T')[0];
    } else if (submitAction === 'submit_for_qa') {
        dataToUpdate.workflowStatus = 'With QA';
        dataToUpdate.processing_date = new Date().toISOString().split('T')[0];
    } else if (submitAction === 'submit_qa') {
        dataToUpdate.workflowStatus = 'Completed';
        dataToUpdate.qa_date = new Date().toISOString().split('T')[0];
    } else if (submitAction === 'send_rework') {
        dataToUpdate.workflowStatus = 'With Processor';
        dataToUpdate.processing_status = 'Re-Work';
    }
    
    if (Object.keys(dataToUpdate).length === 0 && submitAction === 'save') {
        // This can happen if 'save' is clicked with no changes, or no valid fields were sent.
        const existingDoc = await getDoc(projectRef);
        if (existingDoc.exists()) {
            const existingProject = { id: existingDoc.id, ...existingDoc.data() } as Project;
            return { success: true, project: existingProject };
        }
        return { success: false }; // Should not happen if project exists
    } else if (Object.keys(dataToUpdate).length === 0) {
        return { success: false };
    }
    
    // This will now only contain whitelisted, non-undefined fields.
    await updateDoc(projectRef, dataToUpdate);

    revalidatePath('/');
    revalidatePath(`/task/${projectId}`);
    
    const updatedDoc = await getDoc(projectRef);
    const finalProject = { id: updatedDoc.id, ...updatedDoc.data() } as Project;

    return { success: true, project: finalProject };
}
