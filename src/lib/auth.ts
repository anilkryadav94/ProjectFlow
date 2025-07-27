
"use client";

import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged as onFirebaseAuthStateChanged,
    createUserWithEmailAndPassword,
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
        console.warn(`User document not found in Firestore for UID: ${firebaseUser.uid}. Attempting to create it.`);
        // Try to create the user document on the fly if it doesn't exist
        await UserService.ensureUserDocument(firebaseUser);
        const newUserDate = await UserService.getUserDocument(firebaseUser.uid);
        if (newUserDate) {
             return {
                user: {
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...newUserDate
                }
            };
        }
        return null;
    }
}


// --- User Management for Admin Panel ---

export async function getUsers(): Promise<User[]> {
    return UserService.getAllUsers();
}

export async function addUser(email: string, password: string, name: string, roles: Role[]): Promise<void> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    if (firebaseUser) {
        await UserService.addUserDocument(firebaseUser.uid, {email, name, roles});
    } else {
        throw new Error("Failed to create user in Firebase Authentication.");
    }
}


export async function updateUser(userId: string, data: { name?: string, roles?: Role[], password?: string }): Promise<{ success: boolean }> {
    const { password, ...firestoreData } = data;
    await UserService.updateUserDocument(userId, firestoreData);
     if (password) {
        // Changing password from an admin panel is complex and requires admin SDK.
        // For this client-side panel, we will ignore password changes.
        console.warn(`Password change was requested for user ${userId} but was ignored. This must be done by the user themselves or via a backend with admin privileges.`);
    }
    return { success: true };
}


export async function addBulkUsers(newUsers: (Omit<User, 'id'|'password'> & { password?: string })[]): Promise<{ addedCount: number, errors: any[] }> {
    return UserService.addBulkUserDocuments(newUsers);
}
