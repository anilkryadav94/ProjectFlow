'use server';

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import type { User } from './data';

const secretKey = process.env.SESSION_SECRET || "fallback-secret-key-for-development";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Token expires in 1 hour
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

async function findUserByEmail(email: string): Promise<User | null> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
}

export async function login(prevState: { error: string } | undefined, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const user = await findUserByEmail(email);

  // In a real app, you would use a secure password hashing and comparison library like bcrypt.
  // For this example, we'll stick with plain text comparison.
  if (!user || user.password !== password) {
    return { error: 'Invalid email or password.' };
  }
  
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const sessionUser = { id: user.id, email: user.email, name: user.name, roles: user.roles };
  const session = await encrypt({ user: sessionUser, expires });

  cookies().set('session', session, { expires, httpOnly: true });
  return { success: true, user };
}

export async function logout() {
  cookies().set('session', '', { expires: new Date(0) });
}

export async function getSession() {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;
  
  const session = await decrypt(sessionCookie);
  if (!session || new Date(session.expires) < new Date()) {
      return null;
  }
  
  return session;
}

export async function updateUser(updatedUser: User) {
    if (!updatedUser.id) throw new Error("User ID is required for update.");
    
    const userRef = doc(db, 'users', updatedUser.id);
    const updateData: Partial<User> = {
        name: updatedUser.name,
        roles: updatedUser.roles,
    };

    // Only update password if a new one is provided
    if (updatedUser.password) {
        updateData.password = updatedUser.password;
    }
    
    await updateDoc(userRef, updateData);

    const session = await getSession();
    if (session && session.user.id === updatedUser.id) {
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        const sessionUser = { 
            id: updatedUser.id, 
            email: updatedUser.email, 
            name: updatedUser.name, 
            roles: updatedUser.roles 
        };
        const newSession = await encrypt({ user: sessionUser, expires });
        cookies().set('session', newSession, { expires, httpOnly: true });
    }
    
    return { success: true };
}

export async function addUser(newUser: Omit<User, 'id'>) {
    const existingUser = await findUserByEmail(newUser.email);
    if (existingUser) {
        throw new Error('User with this email already exists.');
    }
    
    const docRef = await addDoc(collection(db, 'users'), newUser);
    return { success: true, user: { id: docRef.id, ...newUser } };
}

export async function addBulkUsers(newUsers: Omit<User, 'id'>[]) {
    const addedUsers: User[] = [];
    const errors: { email: string; reason: string }[] = [];

    for (const newUser of newUsers) {
        const existingUser = await findUserByEmail(newUser.email);
        if (existingUser) {
            errors.push({ email: newUser.email, reason: 'Email already exists.' });
        } else {
            const docRef = await addDoc(collection(db, "users"), newUser);
            addedUsers.push({ id: docRef.id, ...newUser });
        }
    }
    
    return { success: true, addedUsers, errors };
}

export async function getUsers(): Promise<User[]> {
    const usersCol = collection(db, "users");
    const userSnapshot = await getDocs(usersCol);
    const userList = userSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as User));
    return userList;
}
