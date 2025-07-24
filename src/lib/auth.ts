
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged as onFirebaseAuthStateChanged,
    updatePassword as updateFirebasePassword,
    type User as FirebaseUser,
} from 'firebase/auth';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, query, where } from 'firebase/firestore';
import type { User, Role } from './data';

// --- Core Auth Functions ---

export function onAuthChanged(callback: (user: import('firebase/auth').User | null) => void) {
    if (typeof window === 'undefined') {
        callback(null);
        return () => {};
    }
    return onFirebaseAuthStateChanged(auth, callback);
}

// This function checks for and creates a user document in Firestore if it doesn't exist.
// This is useful for ensuring users created directly in the Auth console have a corresponding DB record.
async function ensureUserDocument(firebaseUser: FirebaseUser): Promise<void> {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        // User document doesn't exist, create one with default values.
        // An admin can then update their roles and name via the user management UI.
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
    // After successful sign-in, ensure their user document exists in Firestore.
    if (userCredential.user) {
        await ensureUserDocument(userCredential.user);
    }
}

export async function logout(): Promise<void> {
    await signOut(auth);
}

export async function getSession(): Promise<{ user: User } | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) return null;

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as Omit<User, 'id' | 'email'>;
        return {
            user: {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                ...userData
            }
        };
    } else {
        // This case handles users who might be in Firebase Auth but not in Firestore 'users' collection.
        // You might want to log them out or handle this scenario appropriately.
        console.warn(`User document not found in Firestore for UID: ${firebaseUser.uid}`);
        return null;
    }
}


// --- User Management for Admin Panel ---

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
        // IMPORTANT: In a real app, creating users should be done from a secure backend (e.g., Cloud Functions)
        // to avoid exposing credentials or needing a separate authenticated context.
        // The approach here is simplified for this tool's context.
        
        // This creates user in Firebase Authentication
        // This is a temporary auth instance for user creation, as you can't create users from the client SDK directly without this workaround
        // which is not recommended for production.
        
        // A better approach would be a Cloud Function triggered by an admin action.
        // For now, we will simulate this by adding to firestore and assuming an admin can create users in Firebase console.
        
        // We can't create auth user directly from client, so we will just create the firestore record.
        // Admin has to create user in Firebase Auth console manually.
        const usersRef = collection(db, "users");
        
        // Check if email already exists
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error(`User with email ${email} already exists.`);
        }

        // We can't get the UID without creating the user, which we can't do from client.
        // So we will use email as a temporary ID and ask admin to fix it.
        // In a real app with a backend, we'd get a proper UID.
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
    
    // Password update is tricky from client-side admin panel.
    // The current user can only update their own password easily.
    // Updating other users' passwords requires admin privileges on a backend.
    // For this mock, we will log that the password should be changed.
    if (password) {
        console.warn(`Password change requested for user ${userId}. In a real app, this requires a secure backend process. The current user is not authorized to change other users' passwords.`);
        // If you were to implement this with a backend:
        // await admin.auth().updateUser(userId, { password: password });
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
