
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, updateDoc, serverTimestamp, addDoc, getDoc, query, orderBy, limit, Timestamp, where, startAfter, getCountFromServer, QueryConstraint, or, and } from "firebase/firestore";
import type { Project, Role, User } from "@/lib/data";
import { getAllUsers } from "./user-service";


// == HELPERS ==
function convertTimestampsToDates(data: any): any {
    if (!data) return data;
    const newData: { [key: string]: any } = { ...data };
    for (const key in newData) {
        if (newData[key] instanceof Timestamp) {
            newData[key] = newData[key].toDate().toISOString().split('T')[0];
        }
    }
    return newData;
}

const updatableProjectFields = [
  'row_number', 'ref_number', 'application_number', 'patent_number', 'client_name', 'process', 'processor', 'processorId', 'qa', 'qaId', 'case_manager', 'caseManagerId',
  'manager_name', 'sender', 'subject_line', 'country', 'document_type', 'action_taken', 
  'renewal_agent', 'processing_status', 'qa_status', 'clientquery_status', 'error', 'rework_reason', 
  'qa_remark', 'client_query_description', 'client_comments', 'client_error_description', 
  'email_renaming', 'email_forwarded',
  'received_date', 'allocation_date', 'processing_date', 'qa_date', 'reportout_date', 'client_response_date'
] as const;

function buildFilterConstraints(
    filters: {
        quickSearch?: string;
        searchColumn?: string;
        advanced?: { field: string; operator: string; value: any }[] | null;
        clientName?: string;
        process?: string;
        roleFilter?: { role: Role; userName: string; userId: string };
    }
): QueryConstraint[] {
    const andConstraints: QueryConstraint[] = [];
    const dateFields = ['received_date', 'allocation_date', 'processing_date', 'qa_date', 'reportout_date', 'client_response_date'];
    
    // --- SERVER-SIDE ROLE & STATUS FILTERING ---
    if (filters.roleFilter) {
        const { role, userId } = filters.roleFilter;
        if (role === 'Processor') {
            andConstraints.push(where("processorId", "==", userId));
            andConstraints.push(where("workflowStatus", "==", "With Processor"));
        } else if (role === 'QA') {
            andConstraints.push(where("qaId", "==", userId));
            andConstraints.push(where("workflowStatus", "==", "With QA"));
        } else if (role === 'Case Manager') {
            andConstraints.push(where("caseManagerId", "==", userId));
            andConstraints.push(where("processing_status", "==", "Client Query"));
        }
    } else {
        // Apply these filters only if it's NOT a role-based dashboard view
        if (filters.clientName && filters.clientName !== 'all') {
            andConstraints.push(where('client_name', '==', filters.clientName));
        }
        if (filters.process && filters.process !== 'all') {
            andConstraints.push(where('process', '==', filters.process));
        }
    }


    if (filters.advanced && filters.advanced.length > 0) {
        filters.advanced.forEach(criterion => {
            if (!criterion.field || !criterion.operator) return;
            if (criterion.operator !== 'blank' && !criterion.value) return;

            const isDate = dateFields.includes(criterion.field);
            let value = criterion.value;
            if (isDate && value && typeof value === 'string') {
                try {
                  const date = new Date(value);
                  if(!isNaN(date.getTime())) {
                    value = Timestamp.fromDate(date);
                  }
                } catch (e) {
                  // ignore invalid date
                }
            }
            
            switch (criterion.operator) {
                case 'equals':
                case 'dateEquals':
                    andConstraints.push(where(criterion.field, '==', value));
                    break;
                case 'in':
                     const values = typeof value === 'string' ? value.split(',').map((s:string) => s.trim()) : [];
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
             } catch (e) { /* Ignore invalid date */ }
        } else {
             andConstraints.push(where(filters.searchColumn, '>=', filters.quickSearch));
             andConstraints.push(where(filters.searchColumn, '<=', filters.quickSearch + '\uf8ff'));
        }
    }
    
    return andConstraints;
}

// == SERVICE FUNCTIONS ==

export async function getAllProjects(): Promise<Project[]> {
    const projectsCollection = collection(db, "projects");
    const projectsQuery = query(projectsCollection); 

    const projectSnapshot = await getDocs(projectsQuery);
    return projectSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...convertTimestampsToDates(data)
        } as Project;
    });
}

export async function getProjectById(id: string): Promise<Project | undefined> {
    const projectDoc = await getDoc(doc(db, 'projects', id));
    if (projectDoc.exists()) {
        const data = projectDoc.data();
        return { id: projectDoc.id, ...convertTimestampsToDates(data) } as Project;
    }
    return undefined;
}

export async function bulkUpdateProjects(projectIds: string[], updateData: Partial<Project>): Promise<void> {
    const batch = writeBatch(db);
    const users = await getAllUsers();
    
    const dataToUpdate: { [key: string]: any } = {};

    // Copy all provided fields from updateData
    Object.assign(dataToUpdate, updateData);

    // If an ID is provided, also update the corresponding name field
    if (updateData.processorId) {
        dataToUpdate.processor = users.find(u => u.id === updateData.processorId)?.name || '';
        dataToUpdate.workflowStatus = 'With Processor';
    }
    if (updateData.qaId) {
        dataToUpdate.qa = users.find(u => u.id === updateData.qaId)?.name || '';
        if (!dataToUpdate.workflowStatus) dataToUpdate.workflowStatus = 'With QA';
    }
    if (updateData.caseManagerId) {
        dataToUpdate.case_manager = users.find(u => u.id === updateData.caseManagerId)?.name || '';
    }

    projectIds.forEach(id => {
        const projectRef = doc(db, 'projects', id);
        batch.update(projectRef, dataToUpdate);
    });
    await batch.commit();
}


export async function updateProject(
    projectId: string, 
    clientData: Partial<Project>, 
    submitAction?: 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'save' | 'client_submit'
): Promise<Project> {
    if (!projectId) {
        throw new Error("Update failed: No project ID provided.");
    }
    const projectRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(projectRef);
    if (!docSnap.exists()) {
      throw new Error(`No such project found with ID: ${projectId}`);
    }

    const dataToUpdate: { [key: string]: any } = {};
    for (const key of updatableProjectFields) {
        if (Object.prototype.hasOwnProperty.call(clientData, key)) {
            const typedKey = key as keyof typeof clientData;
            const value = clientData[typedKey];
            dataToUpdate[typedKey] = value === "" ? null : value;
        }
    }
    
    // If name is updated, update the corresponding ID
    const users = await getAllUsers();
    if (dataToUpdate.processor) {
        dataToUpdate.processorId = users.find(u => u.name === dataToUpdate.processor)?.id || '';
    }
    if (dataToUpdate.qa) {
        dataToUpdate.qaId = users.find(u => u.name === dataToUpdate.qa)?.id || '';
    }
    if (dataToUpdate.case_manager) {
        dataToUpdate.caseManagerId = users.find(u => u.name === dataToUpdate.case_manager)?.id || '';
    }

    const dateFields: (keyof Project)[] = ['received_date', 'allocation_date', 'processing_date', 'qa_date', 'reportout_date', 'client_response_date'];
    for (const dateField of dateFields) {
        if (dataToUpdate[dateField] && typeof dataToUpdate[dateField] === 'string') {
            const date = new Date(dataToUpdate[dateField]);
             if (!isNaN(date.getTime())) {
                dataToUpdate[dateField] = Timestamp.fromDate(date);
            } else {
                dataToUpdate[dateField] = null;
            }
        }
    }

    if (submitAction === 'client_submit') {
      dataToUpdate.workflowStatus = 'With QA';
      dataToUpdate.qa_status = 'Pending';
      dataToUpdate.client_response_date = serverTimestamp();
    } else if (submitAction === 'submit_for_qa') {
        dataToUpdate.workflowStatus = 'With QA';
        dataToUpdate.qa_status = 'Pending';
        dataToUpdate.processing_date = serverTimestamp();
    } else if (submitAction === 'submit_qa') {
        dataToUpdate.workflowStatus = 'Completed';
        dataToUpdate.qa_date = serverTimestamp();
    } else if (submitAction === 'send_rework') {
        dataToUpdate.workflowStatus = 'With Processor';
        dataToUpdate.processing_status = 'Re-Work';
    }
    
    if (Object.keys(dataToUpdate).length > 0) {
      await updateDoc(projectRef, dataToUpdate);
    }
    
    const updatedDoc = await getDoc(projectRef);
    return { id: updatedDoc.id, ...convertTimestampsToDates(updatedDoc.data()) } as Project;
}

async function getNextRowNumber(): Promise<string> {
    const projectsCollection = collection(db, 'projects');
    const yearPrefix = `PF${new Date().getFullYear().toString().slice(-2)}`;
    
    const q = query(
        projectsCollection, 
        where('row_number', '>=', yearPrefix),
        where('row_number', '<', `${yearPrefix}Z`),
        orderBy('row_number', 'desc'), 
        limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        return `${yearPrefix}00001`;
    } else {
        const lastRowNumber = querySnapshot.docs[0].data().row_number as string;
        const lastSequence = parseInt(lastRowNumber.slice(4), 10);
        const nextSequence = lastSequence + 1;
        return `${yearPrefix}${nextSequence.toString().padStart(5, '0')}`;
    }
}

export async function addRows(projectsToAdd: Partial<Project>[]): Promise<number> {
  if (!projectsToAdd || projectsToAdd.length === 0) {
    throw new Error("No data provided to add.");
  }
  const projectsCollection = collection(db, 'projects');
  const batch = writeBatch(db);
  let currentRowNumber = await getNextRowNumber();
  const users = await getAllUsers();
  
  for (const projectData of projectsToAdd) {
      const newProjectRef = doc(projectsCollection);
      
      const newProject: Omit<Project, 'id'> = {
          row_number: "TBD",
          ref_number: null, application_number: null, patent_number: null, client_name: '', process: 'Patent', 
          processor: '', processorId: '', qa: '', qaId: '', case_manager: '', caseManagerId: '',
          manager_name: null, sender: null, subject_line: null, received_date: null, allocation_date: null, processing_date: null, qa_date: null, reportout_date: null, client_response_date: null, country: null, document_type: null, action_taken: null, renewal_agent: null, workflowStatus: 'With Processor', processing_status: 'Pending', qa_status: 'Pending', clientquery_status: null, error: null, rework_reason: null, qa_remark: null, client_query_description: null, client_comments: null, client_error_description: null, email_renaming: null, email_forwarded: null,
      };

      const finalProjectData = { ...newProject, ...projectData, row_number: currentRowNumber };
      
      if (finalProjectData.processor) {
          finalProjectData.processorId = users.find(u => u.name === finalProjectData.processor)?.id || '';
      }
      if (finalProjectData.qa) {
          finalProjectData.qaId = users.find(u => u.name === finalProjectData.qa)?.id || '';
      }
      if (finalProjectData.case_manager) {
          finalProjectData.caseManagerId = users.find(u => u.name === finalProjectData.case_manager)?.id || '';
      }

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
  return projectsToAdd.length;
}

export async function getPaginatedProjects(options: {
    page: number;
    limit: number;
    filters: {
        quickSearch?: string;
        searchColumn?: string;
        advanced?: { field: string; operator: string; value: any }[] | null;
        roleFilter?: { role: Role; userName: string; userId: string; };
        clientName?: string;
        process?: string;
    };
    sort: { key: string, direction: 'asc' | 'desc' };
}) {
    const { page, limit: pageSize, filters, sort } = options;
    const projectsCollection = collection(db, "projects");

    // Pass all filters to the builder. The builder now correctly handles
    // ignoring clientName/process filters when a roleFilter is active.
    const filterConstraints = buildFilterConstraints(filters);
    
    let queryConstraints: QueryConstraint[] = [];
    if (filterConstraints.length > 0) {
        queryConstraints.push(and(...filterConstraints));
    }
    
    const countQuery = query(projectsCollection, ...queryConstraints);
    const totalCountSnapshot = await getCountFromServer(countQuery);
    const totalCount = totalCountSnapshot.data().count;

    if (sort.key && sort.key !== 'id') {
        queryConstraints.push(orderBy(sort.key, sort.direction));
    } else {
        queryConstraints.push(orderBy('row_number', 'desc')); 
    }

    if (page > 1) {
        const paginationQueryConstraints = [...queryConstraints, limit((page - 1) * pageSize)];
        const tempPaginationQuery = query(projectsCollection, ...paginationQueryConstraints);
        const lastVisibleSnapshot = await getDocs(tempPaginationQuery);
        if (lastVisibleSnapshot.docs.length > 0) {
            const lastVisible = lastVisibleSnapshot.docs[lastVisibleSnapshot.docs.length - 1];
            queryConstraints.push(startAfter(lastVisible));
        }
    }
    
    const finalQueryConstraints = [...queryConstraints, limit(pageSize)];
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
        roleFilter?: { role: Role; userName: string; userId: string };
        clientName?: string;
        process?: string;
    };
    sort: { key: string, direction: 'asc' | 'desc' };
    user?: User;
}): Promise<Project[]> {
    const { filters, sort, user } = options;
    const projectsCollection = collection(db, "projects");
    
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

    return projectSnapshot.docs.map(doc => {
        return {
            id: doc.id,
            ...convertTimestampsToDates(doc.data())
        } as Project;
    });
}
