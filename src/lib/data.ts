import { collection, writeBatch, doc } from 'firebase/firestore';
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

export type ProjectEntry = {
    id: string;
    application_number: string | null;
    patent_number: string | null;
    country: string | null;
    status: string | null;
    notes: string | null;
};

export type Project = {
    id: string;
    ref_number: string | null;
    client_name: string;
    process: ProcessType;
    processor: string;
    sender: string | null;
    subject_line: string;
    received_date: string;
    case_manager: string;
    allocation_date: string;
    processing_date: string | null;
    processing_status: ProcessorStatus;
    application_number: string | null;
    patent_number: string | null;
    country: string | null;
    document_type: string | null;
    action_taken: string | null;
    renewal_agent: string | null;
    client_query_description: string | null;
    client_comments: string | null;
    client_error_description: string | null;
    qa: string;
    qa_date: string | null;
    qa_status: QAStatus;
    qa_remark: string | null;
    error: string | null;
    rework_reason: string | null;
    email_renaming: string | null;
    email_forwarded: string | null;
    reportout_date: string | null;
    manager_name: string | null;
    clientquery_status: ClientStatus | null;
    client_response_date: string | null;
    workflowStatus: WorkflowStatus;
    entries?: ProjectEntry[];
};


export const processors = ['Alice', 'Bob', 'Charlie', 'Rahul'];
export const qas = ['David', 'Eve', 'Anil', 'Ankit', 'Rahul', 'Bob', 'Manager User'];
export const clientNames = ['Client A', 'Client B', 'Client C'];
export const processes: ProcessType[] = ['Patent', 'TM', 'IDS', 'Project'];
export const projectStatuses: any[] = ["Pending", "Completed", "On Hold"];
export const countries = ['USA', 'India', 'Canada', 'UK', 'Germany'];
export const caseManagers = ['CM Alice', 'CM Bob', 'Rahul'];


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

let initialProjects: Omit<Project, 'id'>[] = [
  {
    ref_number: 'REF-001',
    client_name: 'Client A',
    process: 'Patent',
    application_number: 'US16/123,456',
    patent_number: '10,123,456',
    received_date: '2023-10-01',
    allocation_date: '2023-10-02',
    processor: 'Rahul',
    qa: 'Rahul',
    case_manager: 'CM Alice',
    workflowStatus: 'Completed',
    processing_status: 'Processed',
    qa_status: 'Complete',
    processing_date: '2023-10-05',
    qa_date: '2023-10-07',
    rework_reason: null,
    subject_line: 'Invention Disclosure - AI in Healthcare',
    client_comments: null,
    clientquery_status: null,
    client_response_date: null,
    entries: [
        { id: 'entry1', application_number: 'US16/123,456', patent_number: '10,123,456', country: 'USA', status: 'Filed', notes: 'Initial notes' }
    ],
    sender: 'client@clienta.com',
    country: 'USA',
    document_type: 'Disclosure',
    action_taken: 'Filed',
    renewal_agent: null,
    client_query_description: null,
    client_error_description: null,
    qa_remark: 'Looks good.',
    error: null,
    email_renaming: 'REF001_Disclosure.eml',
    email_forwarded: 'attorney@lawfirm.com',
    reportout_date: '2023-10-08',
    manager_name: 'Manager User'
  },
  {
    ref_number: 'REF-002',
    client_name: 'Client B',
    process: 'Patent',
    application_number: 'US16/234,567',
    patent_number: '10,234,567',
    received_date: '2023-10-03',
    allocation_date: '2023-10-04',
    processor: 'Rahul',
    qa: 'Rahul',
    case_manager: 'CM Bob',
    workflowStatus: 'With QA',
    processing_status: 'Processed',
    qa_status: 'Pending',
    processing_date: '2023-10-08',
    qa_date: null,
    rework_reason: null,
    subject_line: 'New Patent Application Filing',
    client_comments: null,
    clientquery_status: null,
    client_response_date: null,
    entries: [],
    sender: 'contact@clientb.com',
    country: 'USA',
    document_type: 'Application',
    action_taken: 'Pending Filing',
    renewal_agent: null,
    client_query_description: null,
    client_error_description: null,
    qa_remark: null,
    error: null,
    email_renaming: 'REF002_NewApp.eml',
    email_forwarded: 'attorney@lawfirm.com',
    reportout_date: null,
    manager_name: 'Manager User'
  },
  {
    ref_number: '',
    client_name: 'Client C',
    process: 'TM',
    application_number: null,
    patent_number: null,
    received_date: '2023-10-10',
    allocation_date: '2023-10-11',
    processor: 'Rahul',
    qa: 'Rahul',
    case_manager: 'CM Alice',
    workflowStatus: 'With Processor',
    processing_status: 'Pending',
    qa_status: 'Pending',
    processing_date: null,
    qa_date: null,
    rework_reason: null,
    subject_line: 'Follow-up on Application XYZ',
    client_comments: null,
    clientquery_status: null,
    client_response_date: null,
    entries: [],
    sender: 'legal@clientc.com',
    country: 'Canada',
    document_type: 'Correspondence',
    action_taken: null,
    renewal_agent: null,
    client_query_description: null,
    client_error_description: null,
    qa_remark: null,
    error: null,
    email_renaming: null,
    email_forwarded: null,
    reportout_date: null,
    manager_name: 'Manager User'
  },
   {
    ref_number: 'REF-005',
    client_name: 'Client B',
    process: 'Patent',
    application_number: null,
    patent_number: null,
    received_date: '2023-10-18',
    allocation_date: '2023-10-19',
    processor: 'Rahul',
    qa: 'Rahul',
    case_manager: 'Rahul',
    workflowStatus: 'With QA',
    processing_status: 'Processed',
    qa_status: 'Client Query',
    processing_date: '2023-10-22',
    qa_date: '2023-10-23',
    rework_reason: 'Need clarification on figure 3.',
    subject_line: 'Response to office action',
    client_comments: null,
    clientquery_status: null,
    client_response_date: null,
    entries: [],
    sender: 'contact@clientb.com',
    country: 'USA',
    document_type: 'Office Action Response',
    action_taken: 'Submitted to USPTO',
    renewal_agent: null,
    client_query_description: 'Client needs to confirm if Figure 3A or 3B is the correct one to use.',
    client_error_description: null,
    qa_remark: 'Sent to case manager for client clarification.',
    error: null,
    email_renaming: 'REF005_OA_Response.eml',
    email_forwarded: 'attorney@lawfirm.com',
    reportout_date: null,
    manager_name: 'Manager User'
  },
];


export const projects: Project[] = initialProjects.map((p, index) => ({
  ...p,
  id: `PF${String(index + 1).padStart(6, '0')}`,
}));

export async function addRows(
  projectsToAdd: Partial<Project>[]
): Promise<{ success: boolean; addedCount?: number; error?: string }> {
  
  if (!projectsToAdd || projectsToAdd.length === 0) {
    return { success: false, error: "No data provided to add." };
  }

  const projectsCollection = collection(db, 'projects');
  const batch = writeBatch(db);
  
  try {
    projectsToAdd.forEach(projectData => {
        const newProjectRef = doc(projectsCollection); // Auto-generate ID

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

        // Apply provided data over the defaults
        const finalProjectData = { ...newProject, ...projectData };
        
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
export async function seedDatabase() {
  try {
    const projectsCollection = collection(db, 'projects');
    const batch = writeBatch(db);
    projects.forEach(project => {
      const { id, ...projectData } = project;
      const docRef = doc(projectsCollection, id);
      batch.set(docRef, projectData);
    });
    await batch.commit();
    console.log('Database has been seeded with initial project data.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// You can call seedDatabase() from a component's useEffect hook once to populate Firestore.
// Example:
// React.useEffect(() => {
//   const doSeed = async () => {
//     const projectsCol = await getDocs(collection(db, 'projects'));
//     if (projectsCol.empty) {
//       await seedDatabase();
//     }
//   }
//   doSeed();
// }, []);
