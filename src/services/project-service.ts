
import { db } from "@/lib/firebase";
import { collection, getDocs, Timestamp, query } from "firebase/firestore";
import type { Project } from "@/lib/data";

function convertTimestampsToDates(data: any): any {
    const newData: { [key: string]: any } = { ...data };
    for (const key in newData) {
        if (newData[key] instanceof Timestamp) {
            newData[key] = newData[key].toDate().toISOString().split('T')[0];
        }
    }
    return newData;
}

/**
 * Fetches all projects from the Firestore database.
 * This is intended for use by server-side logic and AI tools.
 * @returns A promise that resolves to an array of all projects.
 */
export async function getAllProjects(): Promise<Project[]> {
    const projectsCollection = collection(db, "projects");
    const projectsQuery = query(projectsCollection); 

    const projectSnapshot = await getDocs(projectsQuery);
    const projectList = projectSnapshot.docs.map(doc => {
        const data = doc.data();
        const projectWithConvertedDates = convertTimestampsToDates(data);
        return {
            id: doc.id,
            ...projectWithConvertedDates
        } as Project;
    });
    return projectList;
}
