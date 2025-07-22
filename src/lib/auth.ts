
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
    updateDoc
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
  if (!auth.currentUser) return null;

  try {
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return null;
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
    const userDocRef = doc(db, "users", userId);
    
    const updateData: Partial<User> = {};
    if (data.name) updateData.name = data.name;
    if (data.roles) updateData.roles = data.roles;
    
    await updateDoc(userDocRef, updateData);

    if (data.password && auth.currentUser?.uid === userId) {
        await firebaseUpdatePassword(auth.currentUser, data.password);
    } else if (data.password) {
        console.warn("Cannot change other users' passwords from the client.");
    }

    const updatedDoc = await getDoc(userDocRef);

    return { success: true, user: { id: updatedDoc.id, ...updatedDoc.data() } as User };
}

export async function addUser(email: string, password: string, name: string, roles: Role[]): Promise<{ success: boolean; user?: User }> {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const newUser: Omit<User, 'id' | 'password'> = { email, name, roles };
        await setDoc(doc(db, "users", user.uid), newUser);

        return { success: true, user: { id: user.uid, ...newUser } };
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("User with this email already exists.");
        }
        throw new Error("Failed to create user.");
    }
}

export async function addBulkUsers(newUsers: (Omit<User, 'id' | 'password'> & { password?: string })[]): Promise<{ addedCount: number, errors: any[] }> {
    console.warn("Bulk user creation is a placeholder and not secure for production.");

    let addedCount = 0;
    const errors: any[] = [];
    const currentUser = auth.currentUser;

    for (const newUser of newUsers) {
        try {
            if (!newUser.password) {
                errors.push({ email: newUser.email, reason: 'Missing password' });
                continue;
            }
            const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
            const user = userCredential.user;

            const userData: Omit<User, 'id' | 'password'> = { email: newUser.email, name: newUser.name, roles: newUser.roles };
            await setDoc(doc(db, "users", user.uid), userData);
            
            addedCount++;
        } catch (error: any) {
             errors.push({ email: newUser.email, reason: error.message });
        }
    }
    
    // Sign back in the original user if there was one
    if (currentUser) {
        const idToken = await currentUser.getIdToken(true);
        // This is a bit of a hack. A better way would be to use a cloud function.
    } else {
        await signOut(auth);
    }


    return { addedCount, errors };
}
