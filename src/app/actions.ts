
"use server";

import { z } from "zod";
import type { Project, Role, ProjectEntry } from "@/lib/data";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, getDocs, updateDoc } from "firebase/firestore";

const bulkUpdateSchema = z.object({
  projectIds: z.array(z.string()),
  field: z.enum(['processor', 'qa']),
  value: z.string().min(1, "New value cannot be empty."),
});

export async function bulkUpdateProjects(data: z.infer<typeof bulkUpdateSchema>): Promise<{ success: boolean; updatedProjects: Project[] }> {
    const validatedData = bulkUpdateSchema.parse(data);
    const updatedProjects: Project[] = [];

    const batch = writeBatch(db);
    const projectsCollection = collection(db, "projects");

    // Fetch all projects to find the ones to update
    // In a larger app, you'd fetch only the docs with the specified IDs.
    const querySnapshot = await getDocs(projectsCollection);
    const allProjects: Project[] = [];
    querySnapshot.forEach(doc => {
      allProjects.push({ id: doc.id, ...doc.data() } as Project);
    });

    validatedData.projectIds.forEach(id => {
        const project = allProjects.find(p => p.id === id);
        if (project) {
            const projectRef = doc(db, "projects", id);
            batch.update(projectRef, { [validatedData.field]: validatedData.value });
            updatedProjects.push({
                ...project,
                [validatedData.field]: validatedData.value,
            });
        }
    });

    await batch.commit();

    revalidatePath('/');

    return { success: true, updatedProjects };
}

const projectEntrySchema = z.object({
    id: z.string(),
    applicationNumber: z.string().nullable(),
    patentNumber: z.string().nullable(),
    country: z.string().nullable(),
    status: z.string().nullable(),
    notes: z.string().nullable(),
});

const projectSchema = z.object({
  id: z.string(),
  refNumber: z.string().min(1, "Ref Number is required."),
  clientName: z.string().min(1, "Client Name is required."),
  process: z.enum(["Patent", "TM", "IDS", "Project"]),
  applicationNumber: z.string().nullable(),
  patentNumber: z.string().nullable(),
  emailDate: z.string().min(1, "Email Date is required."),
  allocationDate: z.string().min(1, "Allocation Date is required."),
  processor: z.string().min(1, "Processor is required."),
  qa: z.string().min(1, "QA is required."),
  processorStatus: z.enum(["Pending", "On Hold", "Re-Work", "Processed", "NTP", "Client Query", "Already Processed"]),
  qaStatus: z.enum(["Pending", "Complete", "NTP", "Client Query", "Already Processed"]),
  reworkReason: z.string().nullable(),
  subject: z.string().min(1, "Subject is required."),
  processingDate: z.string().nullable(),
  qaDate: z.string().nullable(),
  workflowStatus: z.enum(['Pending Allocation', 'With Processor', 'With QA', 'Completed']),
  entries: z.array(projectEntrySchema).optional(),
});


export async function saveProject(
  data: z.infer<typeof projectSchema>, 
  submitAction: 'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework',
  nextProjectId?: string | null,
  filteredIds?: string | undefined,
  activeRole?: Role | undefined,
): Promise<Project | void> {
    
    const validatedData = projectSchema.parse(data);
    const projectRef = doc(db, "projects", validatedData.id);

    let projectToSave = { ...validatedData };

    if (submitAction === 'submit_for_qa') {
        projectToSave.workflowStatus = 'With QA';
        projectToSave.processingDate = new Date().toISOString().split('T')[0];
    } else if (submitAction === 'submit_qa') {
        projectToSave.workflowStatus = 'Completed';
        projectToSave.qaDate = new Date().toISOString().split('T')[0];
    } else if (submitAction === 'send_rework') {
        projectToSave.workflowStatus = 'With Processor';
        projectToSave.processorStatus = 'Re-Work';
    }

    // In Firestore, we don't save the id inside the document itself.
    const { id, ...saveData } = projectToSave;
    await updateDoc(projectRef, saveData);

    revalidatePath('/');
    revalidatePath(`/task/${projectToSave.id}`);
}
