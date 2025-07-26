import { db } from '@/lib/db';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import type { User, Role } from '@/lib/data';
import type { User as FirebaseUser } from 'firebase/auth';

export async function ensureUserDocument(firebaseUser: FirebaseUser): Promise<void> {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        console.log(`User document for ${firebaseUser.email} not found. Creating one with default role.`);
        const newUser: Omit<User, 'id' | 'password'> = {
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email || 'New User',
            roles: ['Processor'], 
        };
        await setDoc(userDocRef, newUser);
    }
}

export async function getUserDocument(uid: string): Promise<Omit<User, 'id' | 'email'> | null> {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data() as Omit<User, 'id' | 'email'>;
    }
    return null;
}

export async function getAllUsers(): Promise<User[]> {
    const usersCollection = collection(db, 'users');
    const userSnapshot = await getDocs(usersCollection);
    return userSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as User));
}

export async function addUserDocument(userData: Omit<User, 'id' | 'password'>): Promise<void> {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", userData.email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error(`A user with email ${userData.email} already has a data document.`);
    }

    const tempId = `NEEDS_UID__${userData.email.replace(/@.*/, "")}`;
    const newUserDocRef = doc(db, 'users', tempId);
    await setDoc(newUserDocRef, userData);
    console.warn(`Firestore user document created for ${userData.email}. Please create a user in Firebase Auth and update this document's ID to the new UID.`);
}

export async function updateUserDocument(userId: string, data: Partial<Omit<User, 'id' | 'password'>>): Promise<void> {
    if (Object.keys(data).length > 0) {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, data);
    }
}

export async function addBulkUserDocuments(newUsers: Omit<User, 'id' | 'password'>[]): Promise<{ addedCount: number; errors: any[] }> {
    console.warn("Bulk user add only creates Firestore documents. Corresponding Firebase Auth users must be created manually.");
    
    let addedCount = 0;
    const errors: any[] = [];
    const batch = writeBatch(db);
    
    for (const user of newUsers) {
       try {
            const tempId = `NEEDS_UID__${user.email.replace(/@.*/, "")}_${Date.now()}`;
            const newUserDocRef = doc(db, 'users', tempId);
            batch.set(newUserDocRef, user);
            addedCount++;
       } catch (error) {
            errors.push({ email: user.email, error });
       }
    }
    
    await batch.commit();
    return { addedCount, errors };
}
