
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged as onFirebaseAuthStateChanged,
} from 'firebase/auth';
import { auth } from './firebase';
import type { User, Role } from './data';
import * as UserService from '@/services/user-service';

// --- Core Auth Functions ---

export function onAuthChanged(callback: (user: import('firebase/auth').User | null) => void) {
    if (typeof window === 'undefined') {
        callback(null);
        return () => {};
    }
    return onFirebaseAuthStateChanged(auth, callback);
}

export async function login(email: string, password: string): Promise<void> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // After successful sign-in, ensure their user document exists in Firestore.
    if (userCredential.user) {
        await UserService.ensureUserDocument(userCredential.user);
    }
}

export async function logout(): Promise<void> {
    await signOut(auth);
}

export async function getSession(): Promise<{ user: User } | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) return null;

    const userData = await UserService.getUserDocument(firebaseUser.uid);
    
    if (userData) {
        return {
            user: {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                ...userData
            }
        };
    } else {
        console.warn(`User document not found in Firestore for UID: ${firebaseUser.uid}`);
        return null;
    }
}


// --- User Management for Admin Panel ---

export async function getUsers(): Promise<User[]> {
    return UserService.getAllUsers();
}

export async function addUser(email: string, password: string, name: string, roles: Role[]): Promise<void> {
     // NOTE: This function does NOT create a Firebase Auth user. That must be done manually in the Firebase Console.
    await UserService.addUserDocument({email, name, roles});
}


export async function updateUser(userId: string, data: { name?: string, roles?: Role[], password?: string }): Promise<{ success: boolean }> {
    const { password, ...firestoreData } = data;
    await UserService.updateUserDocument(userId, firestoreData);
     if (password) {
        console.warn(`Password change was requested for user ${userId} but was ignored. This must be done by the user themselves or via a backend with admin privileges.`);
    }
    return { success: true };
}


export async function addBulkUsers(newUsers: (Omit<User, 'id'|'password'> & { password?: string })[]): Promise<{ addedCount: number, errors: any[] }> {
    return UserService.addBulkUserDocuments(newUsers);
}
