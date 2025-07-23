
import { type User, type Role, users as mockUsers } from './data';

// Mock implementation of auth functions using sessionStorage to persist login state

const MOCK_USER_SESSION_KEY = 'mockUserEmail';

export function onAuthChanged(callback: (user: any) => void) {
    if (typeof window === 'undefined') {
        callback(null);
        return () => {};
    }

    const handleStorageChange = () => {
        const userEmail = window.sessionStorage.getItem(MOCK_USER_SESSION_KEY);
        if (userEmail) {
            const user = mockUsers.find(u => u.email === userEmail);
            if (user) {
                callback({ uid: user.email, email: user.email });
            } else {
                callback(null);
            }
        } else {
            callback(null);
        }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Initial check
    handleStorageChange();

    // The returned function will be called to unsubscribe
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
}

export async function login(email: string, password: string): Promise<void> {
  console.log(`Mock login attempt for ${email}`);
  const user = mockUsers.find(u => u.email === email && u.password === password);
  if (user) {
    if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(MOCK_USER_SESSION_KEY, email);
        // Dispatch a storage event to notify other tabs/components
        window.dispatchEvent(new Event('storage'));
    }
    return Promise.resolve();
  } else {
    return Promise.reject(new Error('Invalid email or password.'));
  }
}

export async function logout(): Promise<void> {
  console.log("Mock logout");
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(MOCK_USER_SESSION_KEY);
    // Dispatch a storage event to notify other tabs/components
    window.dispatchEvent(new Event('storage'));
  }
  return Promise.resolve();
}

export async function getSession(): Promise<{ user: User } | null> {
    if (typeof window === 'undefined') return null;

    const userEmail = window.sessionStorage.getItem(MOCK_USER_SESSION_KEY);
    if (!userEmail) return null;

    const userFromFile = mockUsers.find(u => u.email === userEmail);
    if (userFromFile) {
        const user: User = {
            id: `mock-user-${userFromFile.email}`,
            email: userFromFile.email,
            name: userFromFile.name,
            roles: userFromFile.roles,
        };
        return { user };
    }
    return null;
}


// --- User management functions remain unchanged ---

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
