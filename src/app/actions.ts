
"use server";

import { z } from "zod";
import type { Project, Role, User } from "@/lib/data";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, updateDoc, serverTimestamp, addDoc, getDoc, query, orderBy, limit, Timestamp, where, startAfter, getCountFromServer, QueryConstraint, or, and } from "firebase/firestore";

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
  'row_number', 'ref_number', 'application_number', 'patent_number', 'client_name', 'process', 'processor', 'qa', 
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
        
        const newProject: Omit<Project, 'id'> = {
            row_number: "TBD", // Will be replaced
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

        const finalProjectData = {
          ...newProject,
          ...projectData,
          row_number: currentRowNumber,
        };
        
        const yearPrefix = currentRowNumber.slice(0, 4);
        const sequence = parseInt(currentRowNumber.slice(4), 10) + 1;
        currentRowNumber = `${yearPrefix}${sequence.toString().padStart(5, '0')}`;

        const dateFields: (keyof Project)[] = ['received_date', 'allocation_date', 'processing_date', 'qa_date', 'reportout_date', 'client_response_date'];
        
        for (const dateField of dateFields) {
            if (finalProjectData[dateField] && typeof finalProjectData[dateField] === 'string') {
                const date = new Date(finalProjectData[dateField] as string);
                if (!isNaN(date.getTime())) {
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

function buildFilterConstraints(
    filters: {
        quickSearch?: string;
        searchColumn?: string;
        advanced?: { field: string; operator: string; value: any }[] | null;
        clientName?: string;
        process?: string;
        roleFilter?: { role: Role; userName: string };
    }
): QueryConstraint[] {
    const andConstraints: QueryConstraint[] = [];
    const dateFields = ['received_date', 'allocation_date', 'processing_date', 'qa_date', 'reportout_date', 'client_response_date'];
    
    // --- Role-based filters ---
    if (filters.roleFilter) {
        const { role, userName } = filters.roleFilter;
        // Manager and Admin see all, so no role-based 'where' clause is added for them.
        if (role === 'Processor') {
            andConstraints.push(where("processor", "==", userName));
        } else if (role === 'QA') {
            andConstraints.push(where("qa", "==", userName));
        } else if (role === 'Case Manager') {
            andConstraints.push(where("case_manager", "==", userName));
        }
    }

    // --- Client Name & Process filters (from header dropdowns) ---
    if (filters.clientName && filters.clientName !== 'all') {
        andConstraints.push(where('client_name', '==', filters.clientName));
    }
    if (filters.process && filters.process !== 'all') {
        andConstraints.push(where('process', '==', filters.process));
    }

    // --- Advanced Filters (Manager Search) ---
    if (filters.advanced && filters.advanced.length > 0) {
        filters.advanced.forEach(criterion => {
            if (!criterion.field || !criterion.operator) return;
            // Allow blank value only for 'blank' operator
            if (criterion.operator !== 'blank' && !criterion.value) return;

            const isDate = dateFields.includes(criterion.field);
            let value = criterion.value;
            if (isDate && value && typeof value === 'string') {
                value = Timestamp.fromDate(new Date(value));
            }
            
            switch (criterion.operator) {
                case 'equals':
                case 'dateEquals':
                    andConstraints.push(where(criterion.field, '==', value));
                    break;
                case 'in':
                     const values = typeof value === 'string' ? value.split(',').map(s => s.trim()) : [];
                     if (values.length > 0) {
                        andConstraints.push(where(criterion.field, 'in', values));
                     }
                    break;
                case 'startsWith':
                case 'contains':
                    andConstraints.push(where(criterion.field, '>=', value));
                    andConstraints.push(where(criterion.field, '<=', value + '\uf8ff'));
                    break;
                case 'blank':
                    andConstraints.push(where(criterion.field, '==', null));
                    break;
            }
        });
    }

    // --- Quick Search Filter ---
    // Note: The 'any' column search is problematic with Firestore's limitations on combining OR queries.
    // It's better to search a specific column. This code handles a single column search.
    if (filters.quickSearch && filters.searchColumn && filters.searchColumn !== 'any') {
        const isDateSearch = dateFields.includes(filters.searchColumn);
        if (isDateSearch) {
             try {
                const date = new Date(filters.quickSearch);
                if (!isNaN(date.getTime())) {
                    const startOfDay = Timestamp.fromDate(new Date(date.setHours(0, 0, 0, 0)));
                    const endOfDay = Timestamp.fromDate(new Date(date.setHours(23, 59, 59, 999)));
                    andConstraints.push(where(filters.searchColumn, '>=', startOfDay));
                    andConstraints.push(where(filters.searchColumn, '<=', endOfDay));
                }
             } catch (e) {
                // Ignore if date is invalid
             }
        } else {
             andConstraints.push(where(filters.searchColumn, '>=', filters.quickSearch));
             andConstraints.push(where(filters.searchColumn, '<=', filters.quickSearch + '\uf8ff'));
        }
    }
    
    return andConstraints;
}

// Server-side pagination and filtering for ALL roles
export async function getPaginatedProjects(options: {
    page: number;
    limit: number;
    filters: {
        quickSearch?: string;
        searchColumn?: string;
        advanced?: { field: string; operator: string; value: any }[] | null;
        roleFilter?: { role: Role; userName: string };
        clientName?: string;
        process?: string;
    };
    sort: { key: string, direction: 'asc' | 'desc' };
}) {
    const { page, limit: pageSize, filters, sort } = options;
    const projectsCollection = collection(db, "projects");

    // Build all filter constraints together
    const filterConstraints = buildFilterConstraints(filters);
    
    let queryConstraints: QueryConstraint[] = [];
    if (filterConstraints.length > 0) {
        queryConstraints.push(and(...filterConstraints));
    }
    
    // Get total count for pagination based on the same filters
    const countQuery = query(projectsCollection, ...queryConstraints);
    const totalCountSnapshot = await getCountFromServer(countQuery);
    const totalCount = totalCountSnapshot.data().count;

    // --- Sorting ---
    if (sort.key && sort.key !== 'id') {
        queryConstraints.push(orderBy(sort.key, sort.direction));
    } else {
        // Default sort if none provided
        queryConstraints.push(orderBy('row_number', 'desc')); 
    }

    // --- Pagination ---
    if (page > 1) {
        // To get the last document of the previous page, we create a query
        // that includes all constraints up to this point and a limit
        const paginationQueryConstraints = [...queryConstraints, limit((page - 1) * pageSize)];
        const tempPaginationQuery = query(projectsCollection, ...paginationQueryConstraints);
        const lastVisibleSnapshot = await getDocs(tempPaginationQuery);
        if (lastVisibleSnapshot.docs.length > 0) {
            const lastVisible = lastVisibleSnapshot.docs[lastVisibleSnapshot.docs.length - 1];
            queryConstraints.push(startAfter(lastVisible));
        }
    }
    
    // Add the page size limit to the final query
    const finalQueryConstraints = [...queryConstraints, limit(pageSize)];

    // --- Final Query ---
    const finalQuery = query(projectsCollection, ...finalQueryConstraints);
    const projectSnapshot = await getDocs(finalQuery);

    const projectList = projectSnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestampsToDates(doc.data())
    } as Project));

    return {
        projects: projectList,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
    };
}


export async function getProjectsForExport(options: {
    filters: {
        quickSearch?: string;
        searchColumn?: string;
        advanced?: { field: string; operator: string; value: any }[] | null;
        roleFilter?: { role: Role; userName: string };
        clientName?: string;
        process?: string;
    };
    sort: { key: string, direction: 'asc' | 'desc' };
    user?: User;
}): Promise<Project[]> {
    const { filters, sort, user } = options;
    const projectsCollection = collection(db, "projects");
    
    // Build all filter constraints together
    const filterConstraints = buildFilterConstraints({
        ...filters,
        ...(filters.roleFilter && user ? { roleFilter: filters.roleFilter } : {})
    });

    let queryConstraints: QueryConstraint[] = [];
    if (filterConstraints.length > 0) {
        queryConstraints.push(and(...filterConstraints));
    }
    
    if (sort.key && sort.key !== 'id') {
        queryConstraints.push(orderBy(sort.key, sort.direction));
    } else {
        queryConstraints.push(orderBy('row_number', 'desc')); 
    }

    const finalQuery = query(projectsCollection, ...queryConstraints);
    const projectSnapshot = await getDocs(finalQuery);

    const projectList = projectSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...convertTimestampsToDates(data)
        } as Project;
    });

    return projectList;
}

