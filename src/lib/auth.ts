
'use server';

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { User, Role } from './data';
import { users as mockUsers } from './data';
import { redirect } from 'next/navigation';

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

function findUserByEmail(email: string): User | undefined {
  return mockUsers.find(u => u.email === email);
}

export async function login(prevState: { error?: string, success?: boolean } | undefined, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const user = findUserByEmail(email);
  
  if (!user || user.password !== password) {
    return { error: 'Invalid email or password.' };
  }
  
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const sessionUser = { id: user.id, email: user.email, name: user.name, roles: user.roles };
  const session = await encrypt({ user: sessionUser, expires });

  cookies().set('session', session, { expires, httpOnly: true });

  // Redirect after successful login
  return redirect('/');
}

export async function logout() {
  cookies().set('session', '', { expires: new Date(0) });
  redirect('/login');
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

// --- User Management Functions ---

export async function getUsers(): Promise<User[]> {
    // In a real app, this would fetch from a database.
    // Here we're returning the mock data.
    return Promise.resolve(mockUsers);
}

export async function updateUser(userToUpdate: User): Promise<{ success: boolean; user?: User }> {
    const index = mockUsers.findIndex(u => u.id === userToUpdate.id);
    if (index === -1) {
        return { success: false };
    }
    // Only update fields that are supposed to change
    mockUsers[index].name = userToUpdate.name;
    mockUsers[index].roles = userToUpdate.roles;
    if (userToUpdate.password) { // only update password if a new one is provided
        mockUsers[index].password = userToUpdate.password;
    }
    return { success: true, user: mockUsers[index] };
}

export async function addUser(newUser: Omit<User, 'id'>): Promise<{ success: boolean; user?: User }> {
    if (mockUsers.some(u => u.email === newUser.email)) {
        throw new Error("User with this email already exists.");
    }
    const user: User = {
        id: (mockUsers.length + 1).toString(),
        ...newUser
    };
    mockUsers.unshift(user); // Add to the beginning of the array
    return { success: true, user };
}

export async function addBulkUsers(newUsers: Omit<User, 'id'>[]): Promise<{ addedUsers: User[], errors: any[] }> {
    const addedUsers: User[] = [];
    const errors: any[] = [];

    newUsers.forEach(newUser => {
        if (mockUsers.some(u => u.email === newUser.email)) {
            errors.push({ email: newUser.email, reason: 'duplicate' });
        } else {
            const user: User = {
                id: (mockUsers.length + 1 + addedUsers.length).toString(),
                ...newUser
            };
            addedUsers.push(user);
        }
    });

    mockUsers.unshift(...addedUsers);
    return { addedUsers, errors };
}
