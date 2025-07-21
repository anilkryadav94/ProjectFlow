"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, doc, addDoc, updateDoc, getDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import type { Project } from "@/lib/data";


const formSchema = z.object({
  id: z.string().optional(),
  refNumber: z.string().min(1, "Reference number is required."),
  clientName: z.string().min(1, "Client name is required."),
  process: z.enum(["Patent", "TM", "IDS", "Project"]),
  applicationNumber: z.string().optional(),
  patentNumber: z.string().optional(),
  emailDate: z.date({ required_error: "Email date is required." }),
  allocationDate: z.date({ required_error: "Allocation date is required." }),
  processor: z.string().min(1, "Processor is required."),
  qa: z.string().min(1, "QA is required."),
  status: z.enum(["Pending", "Processing", "QA", "Complete", "On Hold"]),
  subject: z.string().optional(),
  actionTaken: z.string().optional(),
  documentName: z.string().optional(),
  submitAction: z.enum(['save', 'process', 'qa_complete'])
});

type ProjectFormValues = z.infer<typeof formSchema>;

function toISOString(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
}


export async function saveProject(data: ProjectFormValues): Promise<Project> {
    const validatedData = formSchema.parse(data);

    let projectToSave;
    let existingProjectData: Partial<Project> = {};

    if (validatedData.id) {
        const projectDoc = await getDoc(doc(db, "projects", validatedData.id));
        if (projectDoc.exists()) {
            const fetchedData = projectDoc.data();
            existingProjectData = {
                ...fetchedData,
                emailDate: fetchedData.emailDate ? toISOString(new Timestamp(fetchedData.emailDate.seconds, fetchedData.emailDate.nanoseconds).toDate()) : new Date().toISOString().split('T')[0],
                allocationDate: fetchedData.allocationDate ? toISOString(new Timestamp(fetchedData.allocationDate.seconds, fetchedData.allocationDate.nanoseconds).toDate()) : new Date().toISOString().split('T')[0],
                processingDate: fetchedData.processingDate ? toISOString(new Timestamp(fetchedData.processingDate.seconds, fetchedData.processingDate.nanoseconds).toDate()) : null,
                qaDate: fetchedData.qaDate ? toISOString(new Timestamp(fetchedData.qaDate.seconds, fetchedData.qaDate.nanoseconds).toDate()) : null,
            };
        }
    }

    let processingDate = existingProjectData?.processingDate || null;
    let qaDate = existingProjectData?.qaDate || null;
    let status = validatedData.status;

    if (validatedData.submitAction === 'process') {
        processingDate = new Date().toISOString().split('T')[0];
        status = 'QA';
    } else if (validatedData.submitAction === 'qa_complete') {
        qaDate = new Date().toISOString().split('T')[0];
        status = 'Complete';
    }

    const commonData = {
        ...validatedData,
        applicationNumber: validatedData.applicationNumber || '',
        patentNumber: validatedData.patentNumber || '',
        subject: validatedData.subject || '',
        actionTaken: validatedData.actionTaken || '',
        documentName: validatedData.documentName || '',
        emailDate: Timestamp.fromDate(validatedData.emailDate),
        allocationDate: Timestamp.fromDate(validatedData.allocationDate),
        processingDate: processingDate ? Timestamp.fromDate(new Date(processingDate)) : null,
        qaDate: qaDate ? Timestamp.fromDate(new Date(qaDate)) : null,
        status,
    };
    
    delete (commonData as any).submitAction;


    if (validatedData.id) {
        const projectRef = doc(db, "projects", validatedData.id);
        await updateDoc(projectRef, commonData);
        projectToSave = { ...commonData, id: validatedData.id };
    } else {
        const docRef = await addDoc(collection(db, "projects"), {
            ...commonData,
            createdAt: serverTimestamp()
        });
        projectToSave = { ...commonData, id: docRef.id };
    }
    
    // Return a serializable Project object
    return {
        ...projectToSave,
        emailDate: toISOString(validatedData.emailDate)!,
        allocationDate: toISOString(validatedData.allocationDate)!,
        processingDate: processingDate,
        qaDate: qaDate,
    };
}
