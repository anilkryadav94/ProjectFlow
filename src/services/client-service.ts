
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, orderBy, where, getDoc } from "firebase/firestore";

export interface Client {
    id: string;
    name: string;
}

export async function getAllClients(): Promise<Client[]> {
    const clientsCollection = collection(db, "clients");
    const q = query(clientsCollection, orderBy("name", "asc"));
    const clientSnapshot = await getDocs(q);
    
    if (clientSnapshot.empty) {
        return [];
    }
    
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
