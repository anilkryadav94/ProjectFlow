
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, orderBy, where, writeBatch } from "firebase/firestore";
import { getAllProjects } from "./project-service";

export interface RenewalAgent {
    id: string;
    name: string;
}

export async function getAllRenewalAgents(): Promise<RenewalAgent[]> {
    const renewalAgentsCollection = collection(db, "renewalAgents");
    const q = query(renewalAgentsCollection, orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        console.log("RenewalAgents collection is empty. Seeding from existing projects...");
        const projects = await getAllProjects();
        const distinctNames = [...new Set(projects.map(p => p.renewal_agent).filter(Boolean))];

        if (distinctNames.length > 0) {
            const batch = writeBatch(db);
            distinctNames.forEach(name => {
                if(name) {
                    const newDocRef = doc(renewalAgentsCollection);
                    batch.set(newDocRef, { name });
                }
            });
            await batch.commit();
            console.log(`Seeded ${distinctNames.length} renewal agents.`);
            
            const seededSnapshot = await getDocs(q);
            return seededSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
            }));
        }
        return [];
    }
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
    }));
}

export async function ensureRenewalAgentExists(name: string): Promise<void> {
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return;
    }

    const renewalAgentsCollection = collection(db, "renewalAgents");
    const q = query(renewalAgentsCollection, where("name", "==", name.trim()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log(`Renewal Agent "${name}" not found. Adding to collection.`);
        const newDocRef = doc(renewalAgentsCollection);
        await setDoc(newDocRef, { name: name.trim() });
    }
}
