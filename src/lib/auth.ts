
import { type User, type Role } from './data';
import { auth, db } from './firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    updatePassword as firebaseUpdatePassword,
    onAuthStateChanged
} from 'firebase/auth';
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc,
    query,
    where
} from 'firebase/firestore';

export function onAuthChanged(callback: (user: any) => void) {
    return onAuthStateChanged(auth, callback);
}

export async function login(email: string, password: string): Promise<void> {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    throw new Error('Invalid email or password.');
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function getSession(): Promise<{ user: User } | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
        const userDocRef = doc(db, "users", firebaseUser.email!);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            console.error("No user document found for authenticated user:", firebaseUser.email);
            return null;
        }

        const userData = userDoc.data();
        const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            name: userData.name,
            roles: userData.roles,
        };
        
        return { user };
    } catch (error) {
        console.error("Error getting user session:", error);
        return null;
    }
}


export async function getUsers(): Promise<User[]> {
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollection);
    const usersList: User[] = [];
    usersSnapshot.forEach(doc => {
        usersList.push({ id: doc.id, ...doc.data() } as User);
    });
    return usersList;
}

export async function updateUser(userId: string, data: { name?: string, roles?: Role[], password?: string }): Promise<{ success: boolean; user?: User }> {
    // userId is email in our case
    const userDocRef = doc(db, "users", userId);
    
    const updateData: Partial<User> = {};
    if (data.name) updateData.name = data.name;
    if (data.roles) updateData.roles = data.roles;
    
    await updateDoc(userDocRef, updateData);

    // Password update can only be done for the currently logged-in user for security reasons.
    if (data.password && auth.currentUser?.email === userId) {
        try {
            await firebaseUpdatePassword(auth.currentUser, data.password);
        } catch(e) {
            console.error("Password update failed. User may need to re-authenticate.", e);
            throw new Error("Password update failed. Please log out and log back in to update the password.");
        }
    } else if (data.password) {
        // We cannot update other users' passwords from the client-side SDK.
        // This would require an admin backend (e.g., Cloud Functions).
        console.warn("Skipping password update for another user. This requires an admin backend.");
    }

    const updatedDoc = await getDoc(userDocRef);
    return { success: true, user: { id: updatedDoc.id, ...updatedDoc.data() } as User };
}


export async function addUser(email: string, password: string, name: string, roles: Role[]): Promise<{ success: boolean; user?: User }> {
    // This function creates a user in Firebase Auth and a corresponding document in Firestore.
    // Note: Creating users from the client-side like this has security implications.
    // In a real production app, this should be handled by a secure backend/cloud function.
    try {
        // Temporarily sign out current user if any, to create a new one
        const currentFbUser = auth.currentUser;
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUserFb = userCredential.user;

        const newUser: Omit<User, 'id' | 'password'> = { email, name, roles };
        // Use email as the document ID for consistency with our app structure
        await setDoc(doc(db, "users", email), newUser);

        // Sign back in the original user if there was one.
        // This part is tricky and error-prone on the client. A backend is better.
        if (currentFbUser) {
           await auth.updateCurrentUser(currentFbUser);
        } else {
           await signOut(auth); // Sign out the newly created user
        }


        return { success: true, user: { id: email, ...newUser } };
    } catch (error: any) {
        console.error("Add user failed:", error.code, error.message);
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("User with this email already exists in Firebase Authentication.");
        }
        throw new Error("Failed to create user.");
    }
}

export async function addBulkUsers(newUsers: (Omit<User, 'id' | 'password'> & { password?: string })[]): Promise<{ addedCount: number, errors: any[] }> {
    console.warn("Bulk user creation from client-side is not recommended for production.");

    let addedCount = 0;
    const errors: any[] = [];

    for (const newUser of newUsers) {
        try {
            // Check if user already exists in Firestore
            const userDoc = await getDoc(doc(db, "users", newUser.email));
            if (userDoc.exists()) {
                errors.push({ email: newUser.email, reason: 'User document already exists in Firestore.' });
                continue;
            }

            if (!newUser.password) {
                errors.push({ email: newUser.email, reason: 'Missing password' });
                continue;
            }

            // A proper implementation would use a Cloud Function to create the auth user.
            // Since we can't do that from the client without complex sign-in/sign-out logic,
            // we'll just add the user doc to Firestore and assume auth user will be created separately.
            console.log(`Creating auth user for ${newUser.email} (simulation)... In a real app, this needs a backend.`);
            const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
            
            const userData: Omit<User, 'id' | 'password'> = { email: newUser.email, name: newUser.name, roles: newUser.roles };
            await setDoc(doc(db, "users", newUser.email), userData);
            
            addedCount++;
        } catch (error: any) {
             errors.push({ email: newUser.email, reason: error.message });
        }
    }
    
    // It's crucial to sign out the last created user
    await signOut(auth);

    return { addedCount, errors };
}
