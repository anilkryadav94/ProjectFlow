
'use server'

import { revalidatePath } from 'next/cache'
import { projects } from '@/lib/data'
import type { Project, Role } from '@/lib/data'

type Action = 'save' | 'submit_for_qa' | 'submit_qa' | 'send_rework';

export async function saveProject(
    projectData: Project,
    action: Action
) {
    console.log(`Saving project ${projectData.id} with action: ${action}`);

    // This is where you'd typically save to a database.
    // For this mock implementation, we'll find and update the project in the in-memory array.
    
    let projectToSave = { ...projectData };

    if (action === 'submit_for_qa') {
        projectToSave.workflowStatus = 'With QA';
        projectToSave.processingDate = new Date().toISOString().split('T')[0];
    } else if (action === 'submit_qa') {
        projectToSave.workflowStatus = 'Completed';
        projectToSave.qaDate = new Date().toISOString().split('T')[0];
    } else if (action === 'send_rework') {
        projectToSave.workflowStatus = 'With Processor';
        projectToSave.processorStatus = 'Re-Work';
        // The reworkReason is already part of projectData from the form
    }
    
    const projectIndex = projects.findIndex(p => p.id === projectToSave.id);

    if (projectIndex !== -1) {
        projects[projectIndex] = projectToSave;
        console.log("Project updated in mock data store.");
    } else {
        // If it's a new project (though our current flow doesn't support it from this form)
        projects.push(projectToSave);
        console.log("New project added to mock data store.");
    }
    
    // Revalidate the paths to reflect the changes immediately
    revalidatePath('/');
    revalidatePath(`/task/${projectToSave.id}`);

    return { success: true, project: projectToSave };
}
