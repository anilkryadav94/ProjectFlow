
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, orderBy, where, writeBatch } from "firebase/firestore";
import { getAllProjects } from "./project-service";

export interface DocumentType {
    id: string;
    name: string;
}

export async function getAllDocumentTypes(): Promise<DocumentType[]> {
    const documentTypesCollection = collection(db, "documentTypes");
    const q = query(documentTypesCollection, orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        console.log("DocumentTypes collection is empty. Seeding from existing projects...");
        const projects = await getAllProjects();
        const distinctNames = [...new Set(projects.map(p => p.document_type).filter(Boolean))];

        if (distinctNames.length > 0) {
            const batch = writeBatch(db);
            distinctNames.forEach(name => {
                if(name) {
                    const newDocRef = doc(documentTypesCollection);
                    batch.set(newDocRef, { name });
                }
            });
            await batch.commit();
            console.log(`Seeded ${distinctNames.length} document types.`);
            
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

export async function ensureDocumentTypeExists(name: string): Promise<void> {
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return;
    }

    const documentTypesCollection = collection(db, "documentTypes");
    const q = query(documentTypesCollection, where("name", "==", name.trim()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log(`Document Type "${name}" not found. Adding to collection.`);
        const newDocRef = doc(documentTypesCollection);
        await setDoc(newDocRef, { name: name.trim() });
    }
}
