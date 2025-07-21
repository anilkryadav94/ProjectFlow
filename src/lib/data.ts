export type Role = 'Admin' | 'Manager' | 'Processor' | 'QA';

export type ProjectStatus = 'Pending' | 'Processing' | 'QA' | 'Complete' | 'On Hold';

export type Project = {
  id: string;
  applicationNumber: string;
  patentNumber: string;
  refNumber: string;
  subject: string;
  actionTaken: string;
  documentName: string;
  emailDate: string;
  allocationDate: string;
  processor: string;
  qa: string;
  processingDate: string | null;
  qaDate: string | null;
  status: ProjectStatus;
};

export const roles: Role[] = ['Admin', 'Manager', 'Processor', 'QA'];

export const processors = ['Alice', 'Bob', 'Charlie'];
export const qas = ['David', 'Eve', 'Anil', 'Ankit', 'Rahul'];

export const projects: Project[] = [
  {
    id: '1',
    applicationNumber: 'US16/123,456',
    patentNumber: '10,123,456',
    refNumber: 'REF001',
    subject: 'Invention Disclosure - AI in Healthcare',
    actionTaken: 'First Office Action',
    documentName: 'Response_To_OA.pdf',
    emailDate: '2023-10-01',
    allocationDate: '2023-10-02',
    processor: 'Alice',
    qa: 'David',
    processingDate: '2023-10-05',
    qaDate: '2023-10-07',
    status: 'Complete',
  },
  {
    id: '2',
    applicationNumber: 'US16/234,567',
    patentNumber: '10,234,567',
    refNumber: 'REF002',
    subject: 'New Patent Application Filing',
    actionTaken: '',
    documentName: '',
    emailDate: '2023-10-03',
    allocationDate: '2023-10-04',
    processor: 'Bob',
    qa: 'Anil',
    processingDate: '2023-10-08',
    qaDate: null,
    status: 'QA',
  },
  {
    id: '3',
    applicationNumber: '',
    patentNumber: '',
    refNumber: 'REF003',
    subject: 'Follow-up on Application XYZ',
    actionTaken: '',
    documentName: '',
    emailDate: '2023-10-10',
    allocationDate: '2023-10-11',
    processor: 'Alice',
    qa: 'David',
    processingDate: null,
    qaDate: null,
    status: 'Processing',
  },
  {
    id: '4',
    applicationNumber: '',
    patentNumber: '',
    refNumber: 'REF004',
    subject: 'Urgent: Client Request',
    actionTaken: '',
    documentName: '',
    emailDate: '2023-10-15',
    allocationDate: '2023-10-16',
    processor: 'Alice',
    qa: 'Eve',
    processingDate: null,
    qaDate: null,
    status: 'Pending',
  },
  {
    id: '5',
    applicationNumber: 'US17/567,890',
    patentNumber: '10,567,890',
    refNumber: 'REF005',
    subject: 'Biotech Patent Documents',
    actionTaken: 'Filed Amendment',
    documentName: 'Amendment.pdf',
    emailDate: '2023-09-20',
    allocationDate: '2023-09-21',
    processor: 'Bob',
    qa: 'Ankit',
    processingDate: '2023-09-25',
    qaDate: '2023-09-28',
    status: 'Complete',
  },
    {
    id: '6',
    applicationNumber: '',
    patentNumber: '',
    refNumber: 'REF006',
    subject: 'Query from Patent Office',
    actionTaken: '',
    documentName: '',
    emailDate: '2023-10-20',
    allocationDate: '2023-10-21',
    processor: 'Charlie',
    qa: 'Rahul',
    processingDate: '2023-10-25',
    qaDate: null,
    status: 'On Hold',
  },
  {
    id: '7',
    applicationNumber: '',
    patentNumber: '',
    refNumber: 'REF007',
    subject: 'New Submission for Review',
    actionTaken: '',
    documentName: '',
    emailDate: '2023-11-01',
    allocationDate: '2023-11-02',
    processor: 'Alice',
    qa: 'David',
    processingDate: null,
    qaDate: null,
    status: 'Processing',
  },
];
