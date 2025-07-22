
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
    { id: '10', email: 'rahul@example.com', password: 'password', name: 'Rahul', roles: ['Admin', 'Manager', 'QA', 'Processor'] },
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

export type ProjectEntry = {
    id: string;
    column1: string;
    column2: string;
    notes: string;
};

export type Project = {
  id: string;
  refNumber: string;
  clientName: string;
  process: ProcessType;
  applicationNumber: string | null;
  patentNumber: string | null;
  emailDate: string;
  allocationDate: string;
  processor: string;
  qa: string;
  workflowStatus: WorkflowStatus;
  processorStatus: ProcessorStatus;
  qaStatus: QAStatus;
  processingDate: string | null;
  qaDate: string | null;
  reworkReason: string | null;
  subject: string;
  entries?: ProjectEntry[];
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
    refNumber: 'REF001',
    clientName: 'Client A',
    process: 'Patent',
    applicationNumber: 'US16/123,456',
    patentNumber: '10,123,456',
    emailDate: '2023-10-01',
    allocationDate: '2023-10-02',
    processor: 'Rahul',
    qa: 'Rahul',
    workflowStatus: 'Completed',
    processorStatus: 'Processed',
    qaStatus: 'Complete',
    processingDate: '2023-10-05',
    qaDate: '2023-10-07',
    reworkReason: null,
    subject: 'Invention Disclosure - AI in Healthcare',
    entries: [
        { id: 'entry1', column1: 'Value 1', column2: 'Value 2', notes: 'Initial notes' }
    ]
  },
  {
    id: '2',
    refNumber: 'REF002',
    clientName: 'Client B',
    process: 'Patent',
    applicationNumber: 'US16/234,567',
    patentNumber: '10,234,567',
    emailDate: '2023-10-03',
    allocationDate: '2023-10-04',
    processor: 'Rahul',
    qa: 'Rahul',
    workflowStatus: 'With QA',
    processorStatus: 'Processed',
    qaStatus: 'Pending',
    processingDate: '2023-10-08',
    qaDate: null,
    reworkReason: null,
    subject: 'New Patent Application Filing',
  },
  {
    id: '3',
    refNumber: 'REF003',
    clientName: 'Client C',
    process: 'TM',
    applicationNumber: null,
    patentNumber: null,
    emailDate: '2023-10-10',
    allocationDate: '2023-10-11',
    processor: 'Rahul',
    qa: 'Rahul',
    workflowStatus: 'With Processor',
    processorStatus: 'Pending',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: null,
    subject: 'Follow-up on Application XYZ',
    entries: []
  },
  {
    id: '4',
    refNumber: 'REF004',
    clientName: 'Client A',
    process: 'Project',
    applicationNumber: null,
    patentNumber: null,
    emailDate: '2023-10-15',
    allocationDate: '2023-10-16',
    processor: 'Rahul',
    qa: 'Rahul',
    workflowStatus: 'With Processor',
    processorStatus: 'Pending',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: null,
    subject: 'Urgent: Client Request',
  },
  {
    id: '6',
    refNumber: 'REF006',
    clientName: 'Client C',
    process: 'Patent',
    applicationNumber: null,
    patentNumber: null,
    emailDate: '2023-10-20',
    allocationDate: '2023-10-21',
    processor: 'Rahul',
    qa: 'Rahul',
    workflowStatus: 'With Processor',
    processorStatus: 'On Hold',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: null,
    subject: 'Query from Patent Office',
  },
  {
    id: '7',
    refNumber: 'REF007',
    clientName: 'Client A',
    process: 'Patent',
    applicationNumber: null,
    patentNumber: null,
    emailDate: '2023-11-01',
    allocationDate: '2023-11-02',
    processor: 'Rahul',
    qa: 'Rahul',
    workflowStatus: 'With Processor',
    processorStatus: 'Re-Work',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: 'Incorrect document version attached.',
    subject: 'New Submission for Review - REWORK',
  },
];

    