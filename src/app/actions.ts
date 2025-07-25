
"use server";

import { z } from "zod";
import type { Project, Role, ClientStatus } from "@/lib/data";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, updateDoc, serverTimestamp, addDoc, getDoc, query, orderBy, limit, Timestamp } from "firebase/firestore";

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

// This is the "whitelist" of all fields that are allowed to be updated by a user.
// We use this to build a safe update object.
const updatableProjectFields = [
  'ref_number', 'application_number', 'patent_number', 'client_name', 'process', 'processor', 'qa', 
  'case_manager', 'manager_name', 'sender', 'subject_line', 'country', 'document_type', 'action_taken', 
  'renewal_agent', 'processing_status', 'qa_status', 'clientquery_status', 'error', 'rework_reason', 
  'qa_remark', 'client_query_description', 'client_comments', 'client_error_description', 
  'email_renaming', 'email_forwarded',
  // Date fields are also allowed
  'received_date', 'allocation_date', 'client_response_date'
] as const;


export async function updateProject(
    projectId: string, 
    clientData: Partial<Project>, 
    submitAction?: 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'save' | 'client_submit'
): Promise<{success: boolean, project?: Project, error?: string}> {
    
    if (!projectId) {
        console.error("Update failed: No project ID provided.");
        return { success: false, error: "No project ID provided." };
    }

    const projectRef = doc(db, 'projects', projectId);

    try {
        const docSnap = await getDoc(projectRef);
        if (!docSnap.exists()) {
          console.error(`No such project found with ID: ${projectId}`);
          return { success: false, error: "Project not found." };
        }

        const dataToUpdate: { [key: string]: any } = {};
        
        // Explicitly iterate over the whitelist and only add defined values from clientData
        for (const key of updatableProjectFields) {
            if (Object.prototype.hasOwnProperty.call(clientData, key)) {
                const typedKey = key as keyof typeof clientData;
                if (clientData[typedKey] !== undefined) {
                     dataToUpdate[typedKey] = clientData[typedKey] === "" ? null : clientData[typedKey];
                }
            }
        }

        // Handle status transitions and automatic date stamping based on action
        if (submitAction === 'client_submit') {
          dataToUpdate.workflowStatus = 'With QA';
          dataToUpdate.qa_status = 'Pending';
          dataToUpdate.client_response_date = Timestamp.fromDate(new Date());
        } else if (submitAction === 'submit_for_qa') {
            dataToUpdate.workflowStatus = 'With QA';
            dataToUpdate.processing_date = Timestamp.fromDate(new Date());
        } else if (submitAction === 'submit_qa') {
            dataToUpdate.workflowStatus = 'Completed';
            dataToUpdate.qa_date = Timestamp.fromDate(new Date());
        } else if (submitAction === 'send_rework') {
            dataToUpdate.workflowStatus = 'With Processor';
            dataToUpdate.processing_status = 'Re-Work';
        }
        
        if (Object.keys(dataToUpdate).length === 0) {
            console.log("No valid fields to update for project:", projectId);
            const existingProject = { id: docSnap.id, ...convertTimestampsToDates(docSnap.data()) } as Project;
            return { success: true, project: existingProject };
        }
        
        console.log("Updating project ID:", projectId);
        console.log("Updating Firestore with (sanitized):", dataToUpdate);

        await updateDoc(projectRef, dataToUpdate);

        revalidatePath('/');
        revalidatePath(`/task/${projectId}`);
        
        const updatedDoc = await getDoc(projectRef);
        const finalProject = { id: updatedDoc.id, ...convertTimestampsToDates(updatedDoc.data()) } as Project;

        console.log("Update successful for project:", projectId);
        return { success: true, project: finalProject };

    } catch (error: any) {
        console.error(`Project update error for ID ${projectId}:`, error);
        return { success: false, error: error.message || "An unknown Firestore error occurred." };
    }
}

function convertTimestampsToDates(data: any): any {
    const newData: { [key: string]: any } = { ...data };
    for (const key in newData) {
        if (newData[key] instanceof Timestamp) {
            newData[key] = newData[key].toDate().toISOString().split('T')[0];
        }
    }
    return newData;
}
