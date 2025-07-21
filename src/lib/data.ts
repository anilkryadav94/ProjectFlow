
export type Role = 'Admin' | 'Manager' | 'Processor' | 'QA';
export const roles: Role[] = ['Admin', 'Manager', 'Processor', 'QA'];

export const roleHierarchy: Role[] = ['Admin', 'Manager', 'QA', 'Processor'];

export type User = {
    id: string;
    email: string;
    password?: string;
    name: string;
    roles: Role[];
};

export const users: User[] = [
    { id: '1', email: 'admin@example.com', password: 'password', name: 'Admin User', roles: ['Admin', 'Manager'] },
    { id: '2', email: 'manager@example.com', password: 'password', name: 'Manager User', roles: ['Manager', 'QA'] },
    { id: '3', email: 'alice@example.com', password: 'password', name: 'Alice', roles: ['Processor'] },
    { id: '4', email: 'bob@example.com', password: 'password', name: 'Bob', roles: ['Processor', 'QA'] },
    { id: '5', email: 'charlie@example.com', password: 'password', name: 'Charlie', roles: ['Processor'] },
    { id: '6', email: 'david@example.com', password: 'password', name: 'David', roles: ['QA'] },
    { id: '7', email: 'eve@example.com', password: 'password', name: 'Eve', roles: ['QA'] },
    { id: '8', email: 'anil@example.com', password: 'password', name: 'Anil', roles: ['QA'] },
    { id: '9', email: 'ankit@example.com', password: 'password', name: 'Ankit', roles: ['QA'] },
    { id: '10', email: 'rahul@example.com', password: 'password', name: 'Rahul', roles: ['QA', 'Manager', 'Processor'] },
];

export type WorkflowStatus = 'Pending Allocation' | 'With Processor' | 'With QA' | 'Completed';
export const workflowStatuses: WorkflowStatus[] = ['Pending Allocation', 'With Processor', 'With QA', 'Completed'];

export type ProcessorStatus = 'Pending' | 'On Hold' | 'Re-Work' | 'Processed' | 'NTP' | 'Client Query' | 'Already Processed';
export const processorStatuses: ProcessorStatus[] = ['Pending', 'On Hold', 'Re-Work', 'Processed', 'NTP', 'Client Query', 'Already Processed'];
export const processorActionableStatuses: ProcessorStatus[] = ['Pending', 'On Hold', 'Re-Work'];
export const processorSubmissionStatuses: ProcessorStatus[] = ['Processed', 'NTP', 'Client Query', 'Already Processed'];


export type QAStatus = 'Pending' | 'Complete' | 'NTP' | 'Client Query' | 'Already Processed';
export const qaStatuses: QAStatus[] = ['Pending', 'Complete', 'NTP', 'Client Query', 'Already Processed'];
export const qaSubmissionStatuses: QAStatus[] = ['Complete', 'NTP', 'Client Query', 'Already Processed'];


export type ProcessType = 'Patent' | 'TM' | 'IDS' | 'Project';

export type Project = {
  id: string;
  applicationNumber: string;
  patentNumber: string;
  refNumber: string;
  from?: string;
  subject: string;
  clientName: string;
  process: ProcessType;
  actionTaken: string;
  documentName: string;
  emailDate: string;
  allocationDate: string;
  processor: string;
  qa: string;
  processingDate: string | null;
  qaDate: string | null;
  country: string;
  workflowStatus: WorkflowStatus;
  processorStatus: ProcessorStatus;
  qaStatus: QAStatus;
  reworkReason: string;
};

export const processors = ['Alice', 'Bob', 'Charlie', 'Rahul'];
export const qas = ['David', 'Eve', 'Anil', 'Ankit', 'Rahul', 'Bob', 'Manager User'];
export const clientNames = ['Client A', 'Client B', 'Client C'];
export const processes: ProcessType[] = ['Patent', 'TM', 'IDS', 'Project'];
export const projectStatuses: any[] = []; // This is obsolete now
export const countries = ['USA', 'India', 'Canada', 'UK', 'Germany'];

export const projects: Project[] = [
  {
    id: '1',
    applicationNumber: 'US16/123,456',
    patentNumber: '10,123,456',
    refNumber: 'REF001',
    from: 'client.a@example.com',
    subject: 'Invention Disclosure - AI in Healthcare',
    clientName: 'Client A',
    process: 'Patent',
    actionTaken: 'First Office Action',
    documentName: 'Response_To_OA.pdf',
    emailDate: '2023-10-01',
    allocationDate: '2023-10-02',
    processor: 'Alice',
    qa: 'David',
    processingDate: '2023-10-05',
    qaDate: '2023-10-07',
    country: 'USA',
    workflowStatus: 'Completed',
    processorStatus: 'Processed',
    qaStatus: 'Complete',
    reworkReason: '',
  },
  {
    id: '2',
    applicationNumber: 'US16/234,567',
    patentNumber: '10,234,567',
    refNumber: 'REF002',
    from: 'client.b@example.com',
    subject: 'New Patent Application Filing',
    clientName: 'Client B',
    process: 'Patent',
    actionTaken: '',
    documentName: '',
    emailDate: '2023-10-03',
    allocationDate: '2023-10-04',
    processor: 'Bob',
    qa: 'Anil',
    processingDate: '2023-10-08',
    qaDate: null,
    country: 'USA',
    workflowStatus: 'With QA',
    processorStatus: 'Processed',
    qaStatus: 'Pending',
    reworkReason: '',
  },
  {
    id: '3',
    applicationNumber: '',
    patentNumber: '',
    refNumber: 'REF003',
    from: 'client.c@example.com',
    subject: 'Follow-up on Application XYZ',
    clientName: 'Client C',
    process: 'TM',
    actionTaken: '',
    documentName: '',
    emailDate: '2023-10-10',
    allocationDate: '2023-10-11',
    processor: 'Alice',
    qa: 'David',
    processingDate: null,
    qaDate: null,
    country: 'Canada',
    workflowStatus: 'With Processor',
    processorStatus: 'Pending',
    qaStatus: 'Pending',
    reworkReason: '',
  },
  {
    id: '4',
    applicationNumber: '',
    patentNumber: '',
    refNumber: 'REF004',
    from: 'client.a@example.com',
    subject: 'Urgent: Client Request',
    clientName: 'Client A',
    process: 'Project',
    actionTaken: '',
    documentName: '',
    emailDate: '2023-10-15',
    allocationDate: '2023-10-16',
    processor: 'Alice',
    qa: 'Eve',
    processingDate: null,
    qaDate: null,
    country: 'UK',
    workflowStatus: 'With Processor',
    processorStatus: 'Pending',
    qaStatus: 'Pending',
    reworkReason: '',
  },
    {
    id: '6',
    applicationNumber: '',
    patentNumber: '',
    refNumber: 'REF006',
    from: 'client.c@example.com',
    subject: 'Query from Patent Office',
    clientName: 'Client C',
    process: 'Patent',
    actionTaken: '',
    documentName: '',
    emailDate: '2023-10-20',
    allocationDate: '2023-10-21',
    processor: 'Charlie',
    qa: 'Rahul',
    processingDate: '2023-10-25',
    qaDate: null,
    country: 'India',
    workflowStatus: 'With Processor',
    processorStatus: 'On Hold',
    qaStatus: 'Pending',
    reworkReason: '',
  },
  {
    id: '7',
    applicationNumber: '',
    patentNumber: '',
    refNumber: 'REF007',
    from: 'client.a@example.com',
    subject: 'New Submission for Review - REWORK',
    clientName: 'Client A',
    process: 'Patent',
    actionTaken: '',
    documentName: '',
    emailDate: '2023-11-01',
    allocationDate: '2023-11-02',
    processor: 'Alice',
    qa: 'David',
    processingDate: null,
    qaDate: null,
    country: 'USA',
    workflowStatus: 'With Processor',
    processorStatus: 'Re-Work',
    qaStatus: 'Pending',
    reworkReason: 'Incorrect document version attached.',
  },
];
// Filtered out some projects to simplify the dataset for the demo
const allProjects = projects.filter(p => ['1', '2', '3', '4', '6', '7'].includes(p.id));
export { allProjects as projects };
