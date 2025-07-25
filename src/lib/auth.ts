
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged as onFirebaseAuthStateChanged,
    updatePassword as updateFirebasePassword,
    type User as FirebaseUser,
} from 'firebase/auth';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, query, where } from 'firebase/firestore';
import type { User, Role } from './data';

// --- Core Auth Functions (Client-Side) ---

export function onAuthChanged(callback: (user: import('firebase/auth').User | null) => void) {
    if (typeof window === 'undefined') {
        callback(null);
        return () => {};
    }
    return onFirebaseAuthStateChanged(auth, callback);
}

// This function checks for and creates a user document in Firestore if it doesn't exist.
async function ensureUserDocument(firebaseUser: FirebaseUser): Promise<void> {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        console.log(`User document for ${firebaseUser.email} not found in Firestore. Creating one with default role.`);
        const newUser: Omit<User, 'id' | 'password'> = {
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email || 'New User',
            roles: ['Processor'], // Assign a default, lowest-privilege role.
        };
        await setDoc(userDocRef, newUser);
        console.log(`Created default Firestore document for user: ${firebaseUser.email}`);
    }
}


export async function login(email: string, password: string): Promise<void> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
        await ensureUserDocument(userCredential.user);
    }
}

// --- User Management for Admin Panel (Server-Side safe) ---

export async function getUsers(): Promise<User[]> {
    const usersCollection = collection(db, 'users');
    const userSnapshot = await getDocs(usersCollection);
    const userList = userSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as User));
    return userList;
}

export async function addUser(email: string, password: string, name: string, roles: Role[]): Promise<{ success: boolean; user?: User }> {
    try {
        const usersRef = collection(db, "users");
        
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error(`User with email ${email} already exists.`);
        }

        // We can't get the UID without creating the user, which we can't do from client.
        const tempId = `temp_${email.replace(/@.*/, '')}_${Date.now()}`;
        const newUserDocRef = doc(db, 'users', tempId);

        const newUser: Omit<User, 'id' | 'password'> = {
            email,
            name,
            roles,
        };
        await setDoc(newUserDocRef, newUser);
        
        console.warn(`Firestore user record created for ${email} with temporary ID ${tempId}. Please create a corresponding user in Firebase Authentication console and update the document ID to the new UID.`);

        return { success: true, user: { id: tempId, ...newUser } };
    } catch (error) {
        console.error("Error adding user:", error);
        throw error;
    }
}


export async function updateUser(userId: string, data: { name?: string, roles?: Role[], password?: string }): Promise<{ success: boolean }> {
    const userDocRef = doc(db, 'users', userId);
    
    const { password, ...firestoreData } = data;
    
    if (Object.keys(firestoreData).length > 0) {
        await updateDoc(userDocRef, firestoreData);
    }
    
    if (password) {
        console.warn(`Password change requested for user ${userId}. In a real app, this requires a secure backend process. The current user is not authorized to change other users' passwords.`);
    }
    
    return { success: true };
}


export async function addBulkUsers(newUsers: (Omit<User, 'id'|'password'> & { password?: string })[]): Promise<{ addedCount: number, errors: any[] }> {
    console.warn("Bulk user add is a complex and insecure operation from the client. It is being mocked by adding users to Firestore only. Please create Auth users manually in the Firebase Console.");
    
    let addedCount = 0;
    const errors: any[] = [];
    
    for (const user of newUsers) {
        try {
            await addUser(user.email, user.password || 'password123', user.name, user.roles);
            addedCount++;
        } catch (error) {
            errors.push({ email: user.email, error });
        }
    }
    
    return { addedCount, errors };
}
