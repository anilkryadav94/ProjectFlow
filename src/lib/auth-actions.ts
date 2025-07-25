
'use server';

import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from './data';
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose';

const secretKey = process.env.SESSION_SECRET || "default_secret_key_for_development_only";
const key = new TextEncoder().encode(secretKey);

async function encrypt(payload: any) {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d') // Set session to expire in 1 day
      .sign(key);
}

async function decrypt(input: string): Promise<any> {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
}

export async function createSession(uid: string) {
    const userDocRef = doc(db, 'users', uid);
    let userDoc = await getDoc(userDocRef);

    // If the user document doesn't exist, create it.
    if (!userDoc.exists()) {
        console.log(`User document for ${uid} not found. Creating one.`);
        const newUser: Omit<User, 'id' | 'password'> = {
            email: `user-${uid}@example.com`, // Placeholder email, real one not available on server
            name: 'New User',
            roles: ['Processor'], // Default role
        };
        await setDoc(userDocRef, newUser);
        userDoc = await getDoc(userDocRef); // Re-fetch the document after creation
    }

    const userData = userDoc.data();
    if (!userData) {
      console.error("Could not retrieve user data even after creation check.");
      return;
    }
    
    const sessionPayload = { 
        uid: uid, 
        email: userData.email,
        name: userData.name,
        roles: userData.roles,
    };
    
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    const session = await encrypt(sessionPayload);
    
    cookies().set('session', session, { expires, httpOnly: true });
}

export async function logout() {
    cookies().set('session', '', { expires: new Date(0) });
}

export async function getSession(): Promise<{ user: User } | null> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;

    try {
        const decryptedSession = await decrypt(sessionCookie);
        return {
            user: {
                id: decryptedSession.uid,
                email: decryptedSession.email,
                name: decryptedSession.name,
                roles: decryptedSession.roles,
            }
        };
    } catch (error) {
        console.error("Failed to decrypt session cookie:", error);
        return null;
    }
}
