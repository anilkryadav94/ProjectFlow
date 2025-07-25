
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
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, query, where, writeBatch } from 'firebase/firestore';
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

export async function addUser(email: string, password: string, name: string, roles: Role[]): Promise<void> {
    // NOTE: This function does NOT create a Firebase Auth user. That must be done manually in the Firebase Console.
    // This function only creates the user's data document in Firestore.
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error(`A user with email ${email} already has a data document in Firestore.`);
    }

    // Since we cannot create an Auth user from the client, we cannot know the UID in advance.
    // We will create a document with a temporary ID.
    // The correct approach is for an admin to create the user in the Firebase Auth console,
    // get the UID, and then create a document in the 'users' collection with that UID as the document ID.
    const tempId = `NEEDS_UID__${email.replace(/@.*/, "")}`;
    const newUserDocRef = doc(db, 'users', tempId);

    const newUser: Omit<User, 'id' | 'password'> = {
        email,
        name,
        roles,
    };
    await setDoc(newUserDocRef, newUser);
    console.warn(`Firestore user document created for ${email}. Please create a user in Firebase Auth and update this document's ID to the new UID.`);
}


export async function updateUser(userId: string, data: { name?: string, roles?: Role[], password?: string }): Promise<{ success: boolean }> {
    const userDocRef = doc(db, 'users', userId);
    
    // The password cannot be updated from here. This requires the user to be logged in
    // or for an admin to do it via the Admin SDK on a backend.
    const { password, ...firestoreData } = data;
    
    if (Object.keys(firestoreData).length > 0) {
        await updateDoc(userDocRef, firestoreData);
    }
    
    if (password) {
        console.warn(`Password change was requested for user ${userId} but was ignored. This must be done by the user themselves or via a backend with admin privileges.`);
    }
    
    return { success: true };
}


export async function addBulkUsers(newUsers: (Omit<User, 'id'|'password'> & { password?: string })[]): Promise<{ addedCount: number, errors: any[] }> {
    console.warn("Bulk user add only creates Firestore documents. Corresponding Firebase Auth users must be created manually.");
    
    let addedCount = 0;
    const errors: any[] = [];
    const batch = writeBatch(db);
    const usersRef = collection(db, "users");

    for (const user of newUsers) {
       // We can't check for existence within a batch write, so this is a 'fire and forget' addition.
       // Duplicates might be created if not handled carefully. A backend function is better for this.
       try {
            const tempId = `NEEDS_UID__${user.email.replace(/@.*/, "")}_${Date.now()}`;
            const newUserDocRef = doc(db, 'users', tempId);
            const { password, ...firestoreData } = user;
            batch.set(newUserDocRef, firestoreData);
            addedCount++;
       } catch (error) {
            errors.push({ email: user.email, error });
       }
    }
    
    await batch.commit();

    return { addedCount, errors };
}
