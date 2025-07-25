
"use server";

import { z } from "zod";
import type { Project, Role } from "@/lib/data";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, updateDoc, serverTimestamp, addDoc, getDoc, query, orderBy, limit, Timestamp, where } from "firebase/firestore";

function convertTimestampsToDates(data: any): any {
    const newData: { [key: string]: any } = { ...data };
    for (const key in newData) {
        if (newData[key] instanceof Timestamp) {
            newData[key] = newData[key].toDate().toISOString().split('T')[0];
        }
    }
    return newData;
}


export async function getProjectsForUser(userName: string, roles: Role[]): Promise<Project[]> {
    const projectsCollection = collection(db, "projects");
    let projectsQuery;

    const highestRole = roles.sort((a, b) => {
        const roleOrder = ['Admin', 'Manager', 'QA', 'Case Manager', 'Processor'];
        return roleOrder.indexOf(a) - roleOrder.indexOf(b);
    })[0];

    if (highestRole === 'Admin' || highestRole === 'Manager') {
        projectsQuery = query(projectsCollection); // Admins/Managers get all projects
    } else if (highestRole === 'Processor') {
        projectsQuery = query(projectsCollection, where("processor", "==", userName));
    } else if (highestRole === 'QA') {
        projectsQuery = query(projectsCollection, where("qa", "==", userName));
    } else if (highestRole === 'Case Manager') {
        projectsQuery = query(projectsCollection, where("case_manager", "==", userName));
    } else {
        projectsQuery = query(projectsCollection, where("id", "==", "null")); // No access
    }

    const projectSnapshot = await getDocs(projectsQuery);
    const projectList = projectSnapshot.docs.map(doc => {
        const data = doc.data();
        const projectWithConvertedDates = convertTimestampsToDates(data);
        return {
            id: doc.id,
            ...projectWithConvertedDates
        } as Project;
    });
    return projectList;
}


const bulkUpdateSchema = z.object({
  projectIds: z.array(z.string()),
  field: z.enum(['processor', 'qa', 'case_manager', 'client_name', 'process', 'workflowStatus', 'processing_status', 'qa_status']),
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
  'received_date', 'allocation_date', 'processing_date', 'qa_date', 'reportout_date', 'client_response_date'
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
                const value = clientData[typedKey];
                
                // Convert empty strings to null, otherwise use the value
                dataToUpdate[typedKey] = value === "" ? null : value;
            }
        }
        
        // Convert date strings back to Timestamps for Firestore
        const dateFields: (keyof Project)[] = ['received_date', 'allocation_date', 'processing_date', 'qa_date', 'reportout_date', 'client_response_date'];
        for (const dateField of dateFields) {
            if (dataToUpdate[dateField] && typeof dataToUpdate[dateField] === 'string') {
                const date = new Date(dataToUpdate[dateField]);
                 if (!isNaN(date.getTime())) { // Check if the date is valid
                    dataToUpdate[dateField] = Timestamp.fromDate(date);
                } else {
                    dataToUpdate[dateField] = null; // Set to null if date is invalid
                }
            }
        }

        // Handle status transitions and automatic date stamping based on action
        if (submitAction === 'client_submit') {
          dataToUpdate.workflowStatus = 'With QA';
          dataToUpdate.qa_status = 'Pending';
          dataToUpdate.client_response_date = serverTimestamp();
        } else if (submitAction === 'submit_for_qa') {
            dataToUpdate.workflowStatus = 'With QA';
            dataToUpdate.processing_date = serverTimestamp();
        } else if (submitAction === 'submit_qa') {
            dataToUpdate.workflowStatus = 'Completed';
            dataToUpdate.qa_date = serverTimestamp();
        } else if (submitAction === 'send_rework') {
            dataToUpdate.workflowStatus = 'With Processor';
            dataToUpdate.processing_status = 'Re-Work';
        }
        
        if (Object.keys(dataToUpdate).length === 0 && !submitAction) {
            console.log("No valid fields to update for project:", projectId);
            const existingProject = { id: docSnap.id, ...convertTimestampsToDates(docSnap.data()) } as Project;
            return { success: true, project: existingProject };
        }
        
        console.log("Updating project ID:", projectId);
        console.log("Updating Firestore with (sanitized):", JSON.stringify(dataToUpdate, null, 2));

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

async function getNextRowNumber(): Promise<string> {
    const projectsCollection = collection(db, 'projects');
    const yearPrefix = `PF${new Date().getFullYear().toString().slice(-2)}`;
    
    // Query for the last document with the same year prefix
    const q = query(
        projectsCollection, 
        where('row_number', '>=', yearPrefix),
        where('row_number', '<', `${yearPrefix}Z`), // Lexicographical upper bound
        orderBy('row_number', 'desc'), 
        limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        // First document of the year
        return `${yearPrefix}00001`;
    } else {
        const lastRowNumber = querySnapshot.docs[0].data().row_number as string;
        const lastSequence = parseInt(lastRowNumber.slice(4), 10);
        const nextSequence = lastSequence + 1;
        return `${yearPrefix}${nextSequence.toString().padStart(5, '0')}`;
    }
}


export async function addRows(
  projectsToAdd: Partial<Project>[]
): Promise<{ success: boolean; addedCount?: number; error?: string }> {
  if (!projectsToAdd || projectsToAdd.length === 0) {
    return { success: false, error: "No data provided to add." };
  }

  const projectsCollection = collection(db, 'projects');
  
  try {
    const batch = writeBatch(db);
    let currentRowNumber = await getNextRowNumber();
    
    for (const projectData of projectsToAdd) {
        const newProjectRef = doc(projectsCollection); // Let Firestore generate the document ID
        const { id, row_number, ...restOfProjectData } = projectData as Partial<Project> & {id?: string, row_number?: string};

        const newProject: Omit<Project, 'id' | 'row_number'> = {
            ref_number: null,
            application_number: null,
            patent_number: null,
            client_name: null,
            process: null,
            processor: null,
            qa: null,
            case_manager: null,
            manager_name: null,
            sender: null,
            subject_line: null,
            received_date: null,
            allocation_date: null,
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

        const finalProjectData = { ...newProject, ...restOfProjectData, row_number: currentRowNumber };
        
        // Increment the ref number for the next iteration
        const yearPrefix = currentRowNumber.slice(0, 4);
        const sequence = parseInt(currentRowNumber.slice(4), 10) + 1;
        currentRowNumber = `${yearPrefix}${sequence.toString().padStart(5, '0')}`;

        // Convert date strings to Timestamps before sending to Firestore
        const dateFields: (keyof Project)[] = ['received_date', 'allocation_date', 'processing_date', 'qa_date', 'reportout_date', 'client_response_date'];
        
        for (const dateField of dateFields) {
            if (finalProjectData[dateField] && typeof finalProjectData[dateField] === 'string') {
                const date = new Date(finalProjectData[dateField] as string);
                if (!isNaN(date.getTime())) { // Check if the date is valid
                   (finalProjectData as any)[dateField] = Timestamp.fromDate(date);
                } else {
                   (finalProjectData as any)[dateField] = null;
                }
            }
        }
        
        batch.set(newProjectRef, finalProjectData);
    }

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
