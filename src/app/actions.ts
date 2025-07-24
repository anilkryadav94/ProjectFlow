
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
const updateProjectSchema = z.object({
  ref_number: z.string().nullable().optional(),
  client_name: z.string().optional(),
  process: z.enum(["Patent", "TM", "IDS", "Project"]).optional(),
  subject_line: z.string().optional(),
  application_number: z.string().nullable().optional(),
  patent_number: z.string().nullable().optional(),
  received_date: z.string().optional(),
  allocation_date: z.string().optional(),
  processor: z.string().optional(),
  qa: z.string().optional(),
  case_manager: z.string().optional(),
  processing_status: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]).optional(),
  qa_status: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]).optional(),
  rework_reason: z.string().nullable().optional(),
  client_comments: z.string().nullable().optional(),
  clientquery_status: z.enum(["Approved", "Clarification Required"]).nullable().optional(),
  entries: z.array(projectEntrySchema).optional(),
  sender: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  document_type: z.string().nullable().optional(),
  action_taken: z.string().nullable().optional(),
  renewal_agent: z.string().nullable().optional(),
  client_query_description: z.string().nullable().optional(),
  client_error_description: z.string().nullable().optional(),
  qa_remark: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  email_renaming: z.string().nullable().optional(),
  email_forwarded: z.string().nullable().optional(),
  reportout_date: z.string().nullable().optional(),
  manager_name: z.string().nullable().optional(),
  client_response_date: z.string().nullable().optional(),
  workflowStatus: z.string().optional(),
});


export async function updateProject(data: Partial<Project>, submitAction?: 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'save' | 'client_submit'): Promise<{success: boolean, project?: Project}> {
    
    if (!data.id) return { success: false };
    const projectId = data.id;
    const projectRef = doc(db, 'projects', projectId);

    // Whitelist approach: Build a new, clean object with only the fields that are allowed to be updated.
    const dataToUpdate: { [key: string]: any } = {};
    
    // Validate the incoming data
    const parsedData = updateProjectSchema.parse(data);

    // Iterate over the schema keys and add only defined values to the update object
    for (const key of Object.keys(updateProjectSchema.shape)) {
        if (Object.prototype.hasOwnProperty.call(parsedData, key)) {
            const typedKey = key as keyof typeof parsedData;
            if (parsedData[typedKey] !== undefined) {
                 dataToUpdate[typedKey] = parsedData[typedKey];
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
    
    // Only proceed if there's something to update
    if (Object.keys(dataToUpdate).length === 0) {
        // This can happen if only 'save' is clicked with no changes
        const existingDoc = await getDoc(projectRef);
        const existingProject = { id: existingDoc.id, ...existingDoc.data() } as Project;
        return { success: true, project: existingProject };
    }
    
    await updateDoc(projectRef, dataToUpdate);

    revalidatePath('/');
    revalidatePath(`/task/${projectId}`);
    
    const updatedDoc = await getDoc(projectRef);
    const finalProject = { id: updatedDoc.id, ...updatedDoc.data() } as Project;

    return { success: true, project: finalProject };
}
