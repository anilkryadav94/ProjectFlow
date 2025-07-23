

import { type User, type Role, users as mockUsers } from './data';

// Mock implementation of auth functions using data.ts

export function onAuthChanged(callback: (user: any) => void) {
    // Immediately call with a mock user to simulate login
    const mockUser = { uid: 'mock-admin-id', email: 'admin@example.com' };
    callback(mockUser);
    // Return an empty unsubscribe function
    return () => {};
}

export async function login(email: string, password: string): Promise<void> {
  console.log(`Mock login attempt for ${email}`);
  const user = mockUsers.find(u => u.email === email && u.password === password);
  if (user) {
    return Promise.resolve();
  } else {
    return Promise.reject(new Error('Invalid email or password.'));
  }
}

export async function logout(): Promise<void> {
  console.log("Mock logout");
  return Promise.resolve();
}

export async function getSession(): Promise<{ user: User } | null> {
    const adminUser = mockUsers.find(u => u.email === 'admin@example.com');
    if (adminUser) {
        const user: User = {
            id: 'mock-admin-id',
            email: adminUser.email,
            name: adminUser.name,
            roles: adminUser.roles,
        };
        return { user };
    }
    return null;
}

export async function getUsers(): Promise<User[]> {
    return Promise.resolve(mockUsers.map((u, i) => ({...u, id: `mock-user-${i}`})));
}

export async function updateUser(userId: string, data: { name?: string, roles?: Role[], password?: string }): Promise<{ success: boolean; user?: User }> {
    console.log(`Mock update for user ${userId} with data`, data);
    return Promise.resolve({ success: true });
}

export async function addUser(email: string, password: string, name: string, roles: Role[]): Promise<{ success: boolean; user?: User }> {
     console.log(`Mock add user for ${email}`);
     const newUser: User = { id: `mock-user-${Date.now()}`, email, password, name, roles };
     mockUsers.push(newUser);
     return Promise.resolve({ success: true, user: newUser });
}

export async function addBulkUsers(newUsers: (Omit<User, 'id' | 'password'> & { password?: string })[]): Promise<{ addedCount: number, errors: any[] }> {
    console.log("Mock bulk add users");
    const addedCount = newUsers.length;
    newUsers.forEach(u => mockUsers.push({ ...u, password: u.password || 'password' }));
    return Promise.resolve({ addedCount, errors: [] });
}
