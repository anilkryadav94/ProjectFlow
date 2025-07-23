

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
export const processorActionableStatuses: ProcessorStatus[] = ['Pending', 'On Hold', 'Re-Work'];
export const processorSubmissionStatuses: ProcessorStatus[] = ['Processed', 'NTP', 'Client Query', 'Already Processed'];


export type QAStatus = 'Pending' | 'Complete' | 'NTP' | 'Client Query' | 'Already Processed';
export const qaStatuses: QAStatus[] = ['Pending', 'Complete', 'NTP', 'Client Query', 'Already Processed'];
export const qaSubmissionStatuses: QAStatus[] = ['Complete', 'NTP', 'Client Query', 'Already Processed'];

export type ClientStatus = 'Approved' | 'Clarification Required';
export const clientStatuses: ClientStatus[] = ['Approved', 'Clarification Required'];

export type ProcessType = 'Patent' | 'TM' | 'IDS' | 'Project';

export type ProjectEntry = {
    id: string;
    applicationNumber: string | null;
    patentNumber: string | null;
    country: string | null;
    status: string | null;
    notes: string | null;
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
  caseManager: string;
  workflowStatus: WorkflowStatus;
  processorStatus: ProcessorStatus;
  qaStatus: QAStatus;
  processingDate: string | null;
  qaDate: string | null;
  reworkReason: string | null;
  subject: string;
  clientComments: string | null;
  clientStatus: ClientStatus | null;
  entries?: ProjectEntry[];
};

export const processors = ['Alice', 'Bob', 'Charlie', 'Rahul'];
export const qas = ['David', 'Eve', 'Anil', 'Ankit', 'Rahul', 'Bob', 'Manager User'];
export const clientNames = ['Client A', 'Client B', 'Client C'];
export const processes: ProcessType[] = ['Patent', 'TM', 'IDS', 'Project'];
export const projectStatuses: any[] = ["Pending", "Completed", "On Hold"];
export const countries = ['USA', 'India', 'Canada', 'UK', 'Germany'];
export const caseManagers = ['CM Alice', 'CM Bob'];


export let users: Omit<User, 'id'>[] = [
    { email: 'admin@example.com', password: 'password', name: 'Admin User', roles: ['Admin', 'Manager'] },
    { email: 'manager@example.com', password: 'password', name: 'Manager User', roles: ['Manager', 'QA'] },
    { email: 'alice@example.com', password: 'password', name: 'Alice', roles: ['Processor'] },
    { email: 'bob@example.com', password: 'password', name: 'Bob', roles: ['Processor', 'QA'] },
    { email: 'charlie@example.com', password: 'password', name: 'Charlie', roles: ['Processor'] },
    { email: 'david@example.com', password: 'password', name: 'David', roles: ['QA'] },
    { email: 'eve@example.com', password: 'password', name: 'Eve', roles: ['QA'] },
    { email: 'anil@example.com', password: 'password', name: 'Anil', roles: ['QA'] },
    { email: 'ankit@example.com', password: 'password', name: 'Ankit', roles: ['QA'] },
    { email: 'rahul@example.com', password: 'password', name: 'Rahul', roles: ['Admin', 'Manager', 'QA', 'Processor'] },
    { email: 'cm.alice@example.com', password: 'password', name: 'CM Alice', roles: ['Case Manager'] },
    { email: 'cm.bob@example.com', password: 'password', name: 'CM Bob', roles: ['Case Manager'] },
];

export let projects: Project[] = [
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
    caseManager: 'CM Alice',
    workflowStatus: 'Completed',
    processorStatus: 'Processed',
    qaStatus: 'Complete',
    processingDate: '2023-10-05',
    qaDate: '2023-10-07',
    reworkReason: null,
    subject: 'Invention Disclosure - AI in Healthcare',
    clientComments: null,
    clientStatus: null,
    entries: [
        { id: 'entry1', applicationNumber: 'US16/123,456', patentNumber: '10,123,456', country: 'USA', status: 'Filed', notes: 'Initial notes' }
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
    caseManager: 'CM Bob',
    workflowStatus: 'With QA',
    processorStatus: 'Processed',
    qaStatus: 'Pending',
    processingDate: '2023-10-08',
    qaDate: null,
    reworkReason: null,
    subject: 'New Patent Application Filing',
    clientComments: null,
    clientStatus: null,
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
    caseManager: 'CM Alice',
    workflowStatus: 'With Processor',
    processorStatus: 'Pending',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: null,
    subject: 'Follow-up on Application XYZ',
    clientComments: null,
    clientStatus: null,
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
    caseManager: 'CM Bob',
    workflowStatus: 'With Processor',
    processorStatus: 'Pending',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: null,
    subject: 'Urgent: Client Request',
    clientComments: null,
    clientStatus: null,
  },
  {
    id: '5',
    refNumber: 'REF005',
    clientName: 'Client B',
    process: 'Patent',
    applicationNumber: null,
    patentNumber: null,
    emailDate: '2023-10-18',
    allocationDate: '2023-10-19',
    processor: 'Rahul',
    qa: 'Rahul',
    caseManager: 'CM Alice',
    workflowStatus: 'With QA',
    processorStatus: 'Processed',
    qaStatus: 'Client Query',
    processingDate: '2023-10-22',
    qaDate: null,
    reworkReason: 'Need clarification on figure 3.',
    subject: 'Response to office action',
    clientComments: null,
    clientStatus: null,
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
    caseManager: 'CM Bob',
    workflowStatus: 'With Processor',
    processorStatus: 'On Hold',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: null,
    subject: 'Query from Patent Office',
    clientComments: null,
    clientStatus: null,
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
    caseManager: 'CM Alice',
    workflowStatus: 'With Processor',
    processorStatus: 'Re-Work',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: 'Incorrect document version attached.',
    subject: 'New Submission for Review - REWORK',
    clientComments: null,
    clientStatus: null,
  },
  {
    id: '8',
    refNumber: 'REF008',
    clientName: 'Client B',
    process: 'IDS',
    applicationNumber: 'US17/555,888',
    patentNumber: null,
    emailDate: '2023-11-05',
    allocationDate: '2023-11-06',
    processor: 'Alice',
    qa: 'David',
    caseManager: 'CM Bob',
    workflowStatus: 'With Processor',
    processorStatus: 'Pending',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: null,
    subject: 'IDS verification for Client B',
    clientComments: null,
    clientStatus: null,
  },
  {
    id: '9',
    refNumber: 'REF009',
    clientName: 'Client C',
    process: 'Project',
    applicationNumber: null,
    patentNumber: null,
    emailDate: '2023-11-08',
    allocationDate: '2023-11-09',
    processor: 'Bob',
    qa: 'Eve',
    caseManager: 'CM Alice',
    workflowStatus: 'With Processor',
    processorStatus: 'Pending',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: null,
    subject: 'Special project setup for Client C',
    clientComments: null,
    clientStatus: null,
  },
  {
    id: '10',
    refNumber: 'REF010',
    clientName: 'Client A',
    process: 'Patent',
    applicationNumber: 'US17/999,000',
    patentNumber: null,
    emailDate: '2023-11-10',
    allocationDate: '2023-11-11',
    processor: 'Charlie',
    qa: 'Bob',
    caseManager: 'CM Bob',
    workflowStatus: 'With QA',
    processorStatus: 'Processed',
    qaStatus: 'Pending',
    processingDate: '2023-11-12',
    qaDate: null,
    reworkReason: null,
    subject: 'QA check for patent REF010',
    clientComments: null,
    clientStatus: null,
  },
  {
    id: '11',
    refNumber: 'REF011',
    clientName: 'Client B',
    process: 'TM',
    applicationNumber: null,
    patentNumber: null,
    emailDate: '2023-11-12',
    allocationDate: '2023-11-13',
    processor: 'Alice',
    qa: 'David',
    caseManager: 'CM Alice',
    workflowStatus: 'With Processor',
    processorStatus: 'On Hold',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: null,
    subject: 'Trademark research - waiting for client feedback',
    clientComments: null,
    clientStatus: null,
  },
  {
    id: '12',
    refNumber: 'REF012',
    clientName: 'Client A',
    process: 'Patent',
    applicationNumber: 'US17/111,222',
    patentNumber: null,
    emailDate: '2023-11-15',
    allocationDate: '2023-11-16',
    processor: 'Alice',
    qa: 'David',
    caseManager: 'CM Bob',
    workflowStatus: 'With Processor',
    processorStatus: 'Pending',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: null,
    subject: 'Alice\'s first task',
    clientComments: null,
    clientStatus: null,
  },
  {
    id: '13',
    refNumber: 'REF013',
    clientName: 'Client C',
    process: 'Project',
    applicationNumber: null,
    patentNumber: null,
    emailDate: '2023-11-18',
    allocationDate: '2023-11-19',
    processor: 'Alice',
    qa: 'Eve',
    caseManager: 'CM Alice',
    workflowStatus: 'With QA',
    processorStatus: 'Processed',
    qaStatus: 'Pending',
    processingDate: '2023-11-20',
    qaDate: null,
    reworkReason: null,
    subject: 'Alice\'s second task, now with QA',
    clientComments: null,
    clientStatus: null,
  },
  {
    id: '14',
    refNumber: 'REF014',
    clientName: 'Client B',
    process: 'IDS',
    applicationNumber: 'US17/333,444',
    patentNumber: null,
    emailDate: '2023-11-21',
    allocationDate: '2023-11-22',
    processor: 'Bob',
    qa: 'David',
    caseManager: 'CM Bob',
    workflowStatus: 'With Processor',
    processorStatus: 'Pending',
    qaStatus: 'Pending',
    processingDate: null,
    qaDate: null,
    reworkReason: null,
    subject: 'Bob\'s first task for Client B',
    clientComments: null,
    clientStatus: null,
  },
  {
    id: '15',
    refNumber: 'REF015',
    clientName: 'Client A',
    process: 'Patent',
    applicationNumber: 'US17/555,666',
    patentNumber: '11,000,000',
    emailDate: '2023-11-25',
    allocationDate: '2023-11-26',
    processor: 'Bob',
    qa: 'Eve',
    caseManager: 'CM Alice',
    workflowStatus: 'Completed',
    processorStatus: 'Processed',
    qaStatus: 'Complete',
    processingDate: '2023-11-27',
    qaDate: '2023-11-28',
    reworkReason: null,
    subject: 'Bob\'s second task, completed',
    clientComments: null,
    clientStatus: null,
  },
  {
    id: '16',
    refNumber: 'REF016',
    clientName: 'Client A',
    process: 'Patent',
    applicationNumber: 'US18/111,222',
    patentNumber: null,
    emailDate: '2023-11-28',
    allocationDate: '2023-11-29',
    processor: 'Alice',
    qa: 'Bob',
    caseManager: 'CM Bob',
    workflowStatus: 'With QA',
    processorStatus: 'Processed',
    qaStatus: 'Pending',
    processingDate: '2023-11-30',
    qaDate: null,
    reworkReason: null,
    subject: 'QA Pending for Bob - Project 1',
    clientComments: null,
    clientStatus: null,
  },
  {
    id: '17',
    refNumber: 'REF017',
    clientName: 'Client C',
    process: 'IDS',
    applicationNumber: 'US18/333,444',
    patentNumber: null,
    emailDate: '2023-11-29',
    allocationDate: '2023-11-30',
    processor: 'Charlie',
    qa: 'Bob',
    caseManager: 'CM Alice',
    workflowStatus: 'With QA',
    processorStatus: 'Processed',
    qaStatus: 'Client Query',
    processingDate: '2023-12-01',
    qaDate: null,
    reworkReason: 'Please confirm the reference list with the client.',
    subject: 'QA Pending for Bob - Project 2',
    clientComments: null,
    clientStatus: null,
  }
];


