'use server';

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { users, type Role, type User } from './data';

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
    // This can happen if the token is expired or invalid
    return null;
  }
}

export async function login(prevState: { error: string } | undefined, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const user = users.find((u) => u.email === email);

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
    // In a real app, you'd update this in the database.
    // Here we just find and modify the in-memory user.
    const userIndex = users.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updatedUser };
        
        // If the updated user is the currently logged-in user, update their session
        const session = await getSession();
        if (session && session.user.id === updatedUser.id) {
            const user = users[userIndex];
            const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            const sessionUser = { id: user.id, email: user.email, name: user.name, roles: user.roles };
            const newSession = await encrypt({ user: sessionUser, expires });
            cookies().set('session', newSession, { expires, httpOnly: true });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate DB delay
        return { success: true };
    }
    throw new Error('User not found');
}
