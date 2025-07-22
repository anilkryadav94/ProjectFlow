
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type User, type Role } from './data';
import { auth, db } from './firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    updatePassword as firebaseUpdatePassword
} from 'firebase/auth';
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    writeBatch,
    query,
    where
} from 'firebase/firestore';

const SESSION_COOKIE_NAME = 'projectflow-session';

// This function is now for logging into Firebase and setting a custom session cookie.
export async function login(prevState: { error?: string, success?: boolean } | undefined, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();

    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    cookies().set(SESSION_COOKIE_NAME, idToken, { expires, httpOnly: true });
    
  } catch (error: any) {
    return { error: 'Invalid email or password.' };
  }

  return redirect('/');
}

export async function logout() {
  await signOut(auth);
  cookies().set(SESSION_COOKIE_NAME, '', { expires: new Date(0) });
  redirect('/login');
}

export async function getSession() {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    // We are not verifying the token here on the server for simplicity.
    // In a production app, you would use Firebase Admin SDK to verify the token.
    const userCredential = await auth.updateCurrentUser(auth.currentUser);
    if (!auth.currentUser) return null;

    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return null; // User document not found in Firestore
    }

    const userData = userDoc.data();
    const user: User = {
      id: auth.currentUser.uid,
      email: auth.currentUser.email!,
      name: userData.name,
      roles: userData.roles,
    };
    
    return { user };
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

// --- User Management Functions ---

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
    const userDocRef = doc(db, "users", userId);
    
    const updateData: Partial<User> = {};
    if (data.name) updateData.name = data.name;
    if (data.roles) updateData.roles = data.roles;
    
    await setDoc(userDocRef, updateData, { merge: true });

    if (data.password && auth.currentUser?.uid === userId) {
        await firebaseUpdatePassword(auth.currentUser, data.password);
    } else if (data.password) {
        // Updating other users' passwords requires Admin SDK, which we are not using here.
        // This is a limitation of client-side SDK.
        console.warn("Cannot change other users' passwords from the client.");
    }

    const updatedDoc = await getDoc(userDocRef);

    return { success: true, user: { id: updatedDoc.id, ...updatedDoc.data() } as User };
}


export async function addUser(email: string, password: string, name: string, roles: Role[]): Promise<{ success: boolean; user?: User }> {
    try {
        const tempAuth = auth; // Use the existing auth instance
        // Temporarily create user in Auth. This is tricky without Admin SDK.
        // A better approach would be a Cloud Function. This is a workaround.
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
        const user = userCredential.user;

        const newUser: Omit<User, 'id'> = { email, name, roles };
        await setDoc(doc(db, "users", user.uid), newUser);
        
        // The user is now logged in the server's auth state. Sign them out.
        if (auth.currentUser?.email !== email) {
            await signOut(tempAuth);
        }

        return { success: true, user: { id: user.uid, ...newUser } };
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("User with this email already exists.");
        }
        throw new Error("Failed to create user.");
    }
}


export async function addBulkUsers(newUsers: (Omit<User, 'id' | 'password'> & { password?: string })[]): Promise<{ addedCount: number, errors: any[] }> {
    // This is very limited without the Admin SDK.
    // The Admin SDK can create users without signing them in.
    // The approach here is a major simplification and not recommended for production.
    console.warn("Bulk user creation is a placeholder and not secure for production.");

    let addedCount = 0;
    const errors: any[] = [];
    
    for (const newUser of newUsers) {
        try {
            if (!newUser.password) {
                errors.push({ email: newUser.email, reason: 'Missing password' });
                continue;
            }
            await addUser(newUser.email, newUser.password, newUser.name, newUser.roles);
            addedCount++;
        } catch (error: any) {
             errors.push({ email: newUser.email, reason: error.message });
        }
    }

    return { addedCount, errors };
}
