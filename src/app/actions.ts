"use server";

import { z } from "zod";
import { projects } from "@/lib/data";

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

export async function saveProject(data: ProjectFormValues) {
    const validatedData = formSchema.parse(data);

    let projectToSave;
    const existingProject = validatedData.id ? projects.find(p => p.id === validatedData.id) : null;

    let processingDate = existingProject?.processingDate || null;
    let qaDate = existingProject?.qaDate || null;
    let status = validatedData.status;

    if (validatedData.submitAction === 'process') {
        processingDate = new Date().toISOString().split('T')[0];
        status = 'QA';
    } else if (validatedData.submitAction === 'qa_complete') {
        qaDate = new Date().toISOString().split('T')[0];
        status = 'Complete';
    }

    if (existingProject) {
        projectToSave = {
            ...existingProject,
            ...validatedData,
            applicationNumber: validatedData.applicationNumber || '',
            patentNumber: validatedData.patentNumber || '',
            subject: validatedData.subject || '',
            actionTaken: validatedData.actionTaken || '',
            documentName: validatedData.documentName || '',
            emailDate: validatedData.emailDate.toISOString().split('T')[0],
            allocationDate: validatedData.allocationDate.toISOString().split('T')[0],
            processingDate,
            qaDate,
            status,
        };
    } else {
        projectToSave = {
            id: String(Date.now()), // Create a new ID for new projects
            ...validatedData,
            applicationNumber: validatedData.applicationNumber || '',
            patentNumber: validatedData.patentNumber || '',
            subject: validatedData.subject || '',
            actionTaken: validatedData.actionTaken || '',
            documentName: validatedData.documentName || '',
            emailDate: validatedData.emailDate.toISOString().split('T')[0],
            allocationDate: validatedData.allocationDate.toISOString().split('T')[0],
            processingDate,
            qaDate,
            status,
        };
    }
    
    // Here you would typically save to a database.
    // For this demo, we'll just return the updated/new project object.
    console.log("Saving project:", projectToSave);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    return projectToSave;
}
