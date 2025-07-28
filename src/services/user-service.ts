
import { db } from '@/lib/firebase';
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

export async function getUserDocument(uid: string): Promise<Omit<User, 'id' | 'email' | 'password'> | null> {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data() as Omit<User, 'id' | 'email' | 'password'>;
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

export async function getClients(): Promise<User[]> {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where("roles", "array-contains", "Case Manager"));
    const clientSnapshot = await getDocs(q);
    return clientSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as User));
}


export async function addUserDocument(uid: string, userData: Omit<User, 'id' | 'password'>): Promise<void> {
    const newUserDocRef = doc(db, 'users', uid);
    await setDoc(newUserDocRef, userData);
}


export async function updateUserDocument(userId: string, data: Partial<Omit<User, 'id' | 'password'>>): Promise<void> {
    if (Object.keys(data).length > 0) {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, data);
    }
}


export async function addBulkUserDocuments(newUsers: Omit<User, 'id' | 'password'>[]): Promise<{ addedCount: number; errors: any[] }> {
    console.warn("Bulk user add only creates Firestore documents. Corresponding Firebase Auth users must be created manually or via a backend script.");
    
    let addedCount = 0;
    const errors: any[] = [];
    
    for (const user of newUsers) {
        try {
            // Check if user document already exists
            const q = query(collection(db, "users"), where("email", "==", user.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                errors.push({ email: user.email, error: "User document already exists." });
                continue;
            }
            // Cannot create auth user from client, so this is document-only
            const tempDocRef = doc(collection(db, "users"));
            await setDoc(tempDocRef, user);
            addedCount++;
        } catch (error) {
            errors.push({ email: user.email, error });
        }
    }
    
    return { addedCount, errors };
}

    