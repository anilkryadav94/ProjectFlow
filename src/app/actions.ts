
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
        // This getDoc call is crucial. It "warms up" the connection and ensures
        // the auth state from the client is passed to Firestore's security rules.
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


export async function addRows(
  projectsToAdd: Partial<Project>[]
): Promise<{ success: boolean; addedCount?: number; error?: string }> {
  
  if (!projectsToAdd || projectsToAdd.length === 0) {
    return { success: false, error: "No data provided to add." };
  }

  const projectsCollection = collection(db, 'projects');
  
  try {
    // This getDocs call is crucial. It "warms up" the connection and ensures
    // the auth state from the client is passed to Firestore's security rules for the batch write.
    await getDocs(query(projectsCollection, limit(1)));

    const batch = writeBatch(db);
    
    projectsToAdd.forEach((projectData) => {
        const newProjectRef = doc(projectsCollection); // Let Firestore generate the document ID
        const { id, ...restOfProjectData } = projectData as Partial<Project> & {id?: string};

        const newProject: Omit<Project, 'id'> = {
            ref_number: null,
            application_number: null,
            patent_number: null,
            client_name: 'Client A',
            process: 'Patent',
            processor: 'Alice',
            qa: 'David',
            case_manager: 'CM Alice',
            manager_name: null,
            sender: null,
            subject_line: null,
            received_date: new Date().toISOString().split('T')[0],
            allocation_date: new Date().toISOString().split('T')[0],
            processing_date: null,
            qa_date: null,
            reportout_date: null,
            client_response_date: null,
            country: null,
            document_type: null,
            action_taken: null,
            renewal_agent: null,
            workflowStatus: 'With Processor',
            processing_status: 'Pending',
            qa_status: 'Pending',
            clientquery_status: null,
            error: null,
            rework_reason: null,
            qa_remark: null,
            client_query_description: null,
            client_comments: null,
            client_error_description: null,
            email_renaming: null,
            email_forwarded: null,
        };

        const finalProjectData = { ...newProject, ...restOfProjectData };
        
        // Convert date strings to Timestamps before sending to Firestore
        const dateFields: (keyof Project)[] = ['received_date', 'allocation_date', 'processing_date', 'qa_date', 'reportout_date', 'client_response_date'];
        
        for (const dateField of dateFields) {
            if (finalProjectData[dateField]) {
                (finalProjectData as any)[dateField] = Timestamp.fromDate(new Date(finalProjectData[dateField] as string));
            }
        }
        
        batch.set(newProjectRef, finalProjectData);
    });

    await batch.commit();
    revalidatePath('/');
    
    return { success: true, addedCount: projectsToAdd.length };
  } catch (error) {
    console.error("Error adding documents: ", error);
    if (error instanceof Error) {
        return { success: false, error: `Permission denied or server error: ${error.message}` };
    }
    return { success: false, error: "An unknown error occurred while adding rows."}
  }
}
