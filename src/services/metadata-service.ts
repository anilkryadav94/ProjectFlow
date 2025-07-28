import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, orderBy, updateDoc, deleteDoc, where, writeBatch } from "firebase/firestore";

export interface MetadataItem {
    id: string;
    name: string;
}

export async function getMetadata(collectionName: string): Promise<MetadataItem[]> {
    const metadataCollection = collection(db, collectionName);
    const q = query(metadataCollection, orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
    }));
}

export async function addMetadata(collectionName: string, name: string): Promise<void> {
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw new Error("Item name cannot be empty.");
    }

    const metadataCollection = collection(db, collectionName);
    const q = query(metadataCollection, where("name", "==", name.trim()));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        throw new Error(`Item "${name}" already exists in this collection.`);
    }

    const newDocRef = doc(metadataCollection);
    await setDoc(newDocRef, { name: name.trim() });
}

export async function updateMetadata(collectionName: string, id: string, newName: string): Promise<void> {
     if (!newName || typeof newName !== 'string' || newName.trim() === '') {
        throw new Error("Item name cannot be empty.");
    }
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, { name: newName.trim() });
}


export async function deleteMetadata(collectionName: string, id: string): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
}
