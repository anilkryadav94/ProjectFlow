
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, orderBy, where, writeBatch } from "firebase/firestore";
import { getAllProjects } from "./project-service";

export interface Client {
    id: string;
    name: string;
}

export async function getAllClients(): Promise<Client[]> {
    const clientsCollection = collection(db, "clients");
    const q = query(clientsCollection, orderBy("name", "asc"));
    const clientSnapshot = await getDocs(q);
    
    // If the collection is empty, perform a one-time seeding from projects
    if (clientSnapshot.empty) {
        console.log("Clients collection is empty. Seeding from existing projects...");
        const projects = await getAllProjects();
        const distinctClientNames = [...new Set(projects.map(p => p.client_name).filter(Boolean))];

        if (distinctClientNames.length > 0) {
            const batch = writeBatch(db);
            distinctClientNames.forEach(name => {
                const newClientRef = doc(clientsCollection);
                batch.set(newClientRef, { name });
            });
            await batch.commit();
            console.log(`Seeded ${distinctClientNames.length} clients.`);
            
            // Fetch again after seeding
            const seededSnapshot = await getDocs(q);
            return seededSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
            }));
        }
        return []; // Return empty if no projects to seed from
    }
    
    // If collection is not empty, return the clients
    return clientSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
    }));
}

export async function ensureClientExists(clientName: string): Promise<void> {
    if (!clientName || typeof clientName !== 'string' || clientName.trim() === '') {
        return;
    }

    const clientsCollection = collection(db, "clients");
    const q = query(clientsCollection, where("name", "==", clientName.trim()));
    const clientSnapshot = await getDocs(q);

    if (clientSnapshot.empty) {
        console.log(`Client "${clientName}" not found. Adding to clients collection.`);
        const newClientRef = doc(clientsCollection);
        await setDoc(newClientRef, { name: clientName.trim() });
    }
}
