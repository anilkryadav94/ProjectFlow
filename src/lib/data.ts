
import { collection, writeBatch, doc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

export type Role = 'Admin' | 'Manager' | 'Processor' | 'QA' | 'Case Manager';
export const roles: Role[] = ['Admin', 'Manager', 'Processor', 'QA', 'Case Manager'];

export const roleHierarchy: Role[] = ['Admin', 'Manager', 'QA', 'Case Manager', 'Processor'];

export type User = {
    id: string;
    email: string;
    password?: string;
    name: string;
    roles: Role[];
};

export type WorkflowStatus = 'Pending Allocation' | 'With Processor' | 'With QA' | 'Completed';
export const workflowStatuses: WorkflowStatus[] = ['Pending Allocation', 'With Processor', 'With QA', 'Completed'];

export type ProcessorStatus = 'Pending' | 'On Hold' | 'Re-Work' | 'Processed' | 'NTP' | 'Client Query' | 'Already Processed';
export const processorStatuses: ProcessorStatus[] = ['Pending', 'On Hold', 'Re-Work', 'Processed', 'NTP', 'Client Query', 'Already Processed'];
export const allProcessorStatuses: ProcessorStatus[] = processorStatuses;
export const processorActionableStatuses: ProcessorStatus[] = ['Pending', 'On Hold', 'Re-Work'];
export const processorSubmissionStatuses: ProcessorStatus[] = ['Processed', 'NTP', 'Client Query', 'Already Processed'];


export type QAStatus = 'Pending' | 'Complete' | 'NTP' | 'Client Query' | 'Already Processed';
export const qaStatuses: QAStatus[] = ['Pending', 'Complete', 'NTP', 'Client Query', 'Already Processed'];
export const allQaStatuses: QAStatus[] = qaStatuses;
export const qaSubmissionStatuses: QAStatus[] = ['Complete', 'NTP', 'Client Query', 'Already Processed'];

export type ClientStatus = 'Approved' | 'Clarification Required';
export const clientStatuses: ClientStatus[] = ['Approved', 'Clarification Required'];

export type ProcessType = 'Patent' | 'TM' | 'IDS' | 'Project';

export type Project = {
    id: string;
    ref_number: string | null;
    application_number: string | null;
    patent_number: string | null;
    client_name: string;
    process: ProcessType;
    processor: string;
    qa: string;
    case_manager: string;
    manager_name: string | null;
    sender: string | null;
    subject_line: string | null;
    received_date: string | null;
    allocation_date: string | null;
    processing_date: string | null;
    qa_date: string | null;
    reportout_date: string | null;
    client_response_date: string | null;
    country: string | null;
    document_type: string | null;
    action_taken: string | null;
    renewal_agent: string | null;
    workflowStatus: WorkflowStatus;
    processing_status: ProcessorStatus;
    qa_status: QAStatus;
    clientquery_status: ClientStatus | null;
    error: 'Yes' | 'No' | null;
    rework_reason: string | null;
    qa_remark: string | null;
    client_query_description: string | null;
    client_comments: string | null;
    client_error_description: string | null;
    email_renaming: string | null;
    email_forwarded: 'Yes' | 'No' | null;
};


export const processors = ['Alice', 'Bob', 'Charlie', 'Rahul'];
export const qas = ['David', 'Eve', 'Anil', 'Ankit', 'Rahul', 'Bob', 'Manager User'];
export const clientNames = ['Client A', 'Client B', 'Client C'];
export const processes: ProcessType[] = ['Patent', 'TM', 'IDS', 'Project'];
export const projectStatuses: any[] = ["Pending", "Completed", "On Hold"];
export const countries = ['USA', 'India', 'Canada', 'UK', 'Germany'];
export const caseManagers = ['CM Alice', 'CM Bob', 'Rahul'];
export const managerNames = ['Manager User'];
export const renewalAgents = ['Agent X', 'Agent Y'];
export const documentTypes = ['Disclosure', 'Application', 'Office Action Response', 'Correspondence'];
export const errorOptions: ('Yes' | 'No')[] = ['Yes', 'No'];
export const emailForwardedOptions: ('Yes' | 'No')[] = ['Yes', 'No'];


export let users: Omit<User, 'id'>[] = [
    { email: 'admin@example.com', password: 'password', name: 'Admin User', roles: ['Admin', 'Manager'] },
    { email: 'manager@example.com', password: 'password', name: 'Manager User', roles: ['Manager', 'QA'] },
    { email: 'alice@example.com', password: 'password', name: 'Alice', roles: ['Processor'] },
    { email: 'bob@example.com', password: 'password', name: 'Bob', roles: ['Processor'] },
    { email: 'charlie@example.com', password: 'password', name: 'Charlie', roles: ['Processor'] },
    { email: 'david@example.com', password: 'password', name: 'David', roles: ['QA'] },
    { email: 'eve@example.com', password: 'password', name: 'Eve', roles: ['QA'] },
    { email: 'anil@example.com', password: 'password', name: 'Anil', roles: ['QA'] },
    { email: 'ankit@example.com', password: 'password', name: 'Ankit', roles: ['QA'] },
    { email: 'rahul@example.com', password: 'password', name: 'Rahul', roles: ['Admin', 'Manager', 'QA', 'Processor', 'Case Manager'] },
    { email: 'cm.alice@example.com', password: 'password', name: 'CM Alice', roles: ['Case Manager'] },
    { email: 'cm.bob@example.com', password: 'password', name: 'CM Bob', roles: ['Case Manager'] },
];

export async function addRows(
  projectsToAdd: Partial<Project>[]
): Promise<{ success: boolean; addedCount?: number; error?: string }> {
  
  if (!projectsToAdd || projectsToAdd.length === 0) {
    return { success: false, error: "No data provided to add." };
  }

  const projectsCollection = collection(db, 'projects');
  const batch = writeBatch(db);
  
  try {
    
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
        
        batch.set(newProjectRef, finalProjectData);
    });

    await batch.commit();
    
    return { success: true, addedCount: projectsToAdd.length };
  } catch (error) {
    console.error("Error adding documents: ", error);
    if (error instanceof Error) {
        return { success: false, error: `Permission denied or server error: ${error.message}` };
    }
    return { success: false, error: "An unknown error occurred while adding rows."}
  }
}


// This function is for one-time seeding of the database.
// It is now disabled from being called automatically as per user request.
export async function seedDatabase() {
  /*
  const initialProjects: Omit<Project, 'id'>[] = [
    // Sample data can be re-added here if needed in the future
  ];
  try {
    const projectsCollection = collection(db, 'projects');
    const projectDocs = await getDocs(query(projectsCollection, limit(1)));
    if (projectDocs.empty) {
        console.log('Projects collection is empty. Seeding database...');
        const batch = writeBatch(db);
        initialProjects.forEach(project => {
          const docRef = doc(projectsCollection); // Auto-generate ID
          batch.set(docRef, project);
        });
        await batch.commit();
        console.log('Database has been seeded with initial project data.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
  */
}
