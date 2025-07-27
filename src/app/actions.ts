"use server";

import { z } from "zod";
import type { Project, User } from "@/lib/data";
import { revalidatePath } from "next/cache";
import * as ProjectService from '@/services/project-service';


export async function getProjectsForUser(userName: string, roles: import("@/lib/data").Role[]): Promise<Project[]> {
    // This function is now less relevant for client-side dashboards but kept for potential future use.
    // The main fetching logic is now client-side in the dashboard component.
    return []; 
}

const bulkUpdateSchema = z.object({
  projectIds: z.array(z.string()),
  field: z.enum(['processor', 'qa', 'case_manager', 'client_name', 'process', 'workflowStatus', 'processing_status', 'qa_status']),
  value: z.string().min(1, "New value cannot be empty."),
});

export async function bulkUpdateProjects(data: z.infer<typeof bulkUpdateSchema>): Promise<{ success: boolean; updatedProjects?: Project[] }> {
    const validatedData = bulkUpdateSchema.parse(data);
    
    await ProjectService.bulkUpdateProjects(validatedData.projectIds, { [validatedData.field]: validatedData.value });

    revalidatePath('/');
    return { success: true };
}


export async function updateProject(
    projectId: string, 
    clientData: Partial<Project>, 
    submitAction?: 'submit_for_qa' | 'submit_qa' | 'send_rework' | 'save' | 'client_submit'
): Promise<{success: boolean, project?: Project, error?: string}> {
     try {
        const updatedProject = await ProjectService.updateProject(projectId, clientData, submitAction);
        revalidatePath('/');
        revalidatePath(`/task/${projectId}`);
        return { success: true, project: updatedProject };
    } catch (error: any) {
        console.error(`Action: Project update error for ID ${projectId}:`, error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}


export async function addRows(
  projectsToAdd: Partial<Project>[]
): Promise<{ success: boolean; addedCount?: number; error?: string }> {
  try {
    const addedCount = await ProjectService.addRows(projectsToAdd);
    revalidatePath('/');
    return { success: true, addedCount };
  } catch (error) {
    console.error("Action: Error adding documents: ", error);
    if (error instanceof Error) {
        return { success: false, error: `Permission denied or server error: ${error.message}` };
    }
    return { success: false, error: "An unknown error occurred while adding rows."}
  }
}

export async function getPaginatedProjects(options: {
    page: number;
    limit: number;
    filters: {
        quickSearch?: string;
        searchColumn?: string;
        advanced?: { field: string; operator: string; value: any }[] | null;
        roleFilter?: { role: import("@/lib/data").Role; userName: string; userId: string };
        clientName?: string;
        process?: string;
    };
    sort: { key: string, direction: 'asc' | 'desc' };
}) {
    // This function is now primarily for the Manager/Admin search results page.
    // Role-based dashboards use client-side fetching.
    return ProjectService.getPaginatedProjects(options);
}


export async function getProjectsForExport(options: {
    filters: {
        quickSearch?: string;
        searchColumn?: string;
        advanced?: { field: string; operator: string; value: any }[] | null;
        roleFilter?: { role: import("@/lib/data").Role; userName: string; userId: string };
        clientName?: string;
        process?: string;
    };
    sort: { key: string, direction: 'asc' | 'desc' };
    user?: User;
}): Promise<Project[]> {
    return ProjectService.getProjectsForExport(options);
}
