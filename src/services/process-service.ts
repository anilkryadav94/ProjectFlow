
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, orderBy, where } from "firebase/firestore";

export interface Process {
    id: string;
    name: string;
}

export async function getAllProcesses(): Promise<Process[]> {
    const processesCollection = collection(db, "processes");
    const q = query(processesCollection, orderBy("name", "asc"));
    const processSnapshot = await getDocs(q);
    
    if (processSnapshot.empty) {
        // Seed initial processes if collection is empty
        const initialProcesses = ['Patent', 'TM', 'IDS', 'Project'];
        for (const processName of initialProcesses) {
            await ensureProcessExists(processName);
        }
        // Fetch again after seeding
        const seededSnapshot = await getDocs(q);
        return seededSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
        }));
    }
    
    return processSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
    }));
}

export async function ensureProcessExists(processName: string): Promise<void> {
     if (!processName || typeof processName !== 'string' || processName.trim() === '') {
        return;
    }
    const processesCollection = collection(db, "processes");
    const q = query(processesCollection, where("name", "==", processName.trim()));
    const processSnapshot = await getDocs(q);

    if (processSnapshot.empty) {
        console.log(`Process "${processName}" not found. Adding to processes collection.`);
        const newProcessRef = doc(processesCollection);
        await setDoc(newProcessRef, { name: processName.trim() });
    }
}
