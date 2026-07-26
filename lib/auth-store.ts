import crypto from "crypto";

type UserRecord = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
};

type SessionRecord = {
  id: string;
  user_id: string;
  token: string;
};

declare global {
  var __shadownodeAuthStore:
    | {
        users: UserRecord[];
        sessions: SessionRecord[];
      }
    | undefined;
}

export const authStore = (globalThis.__shadownodeAuthStore ??= {
  users: [],
  sessions: [],
});

export function findUserByUsername(username: string) {
  return authStore.users.find((user) => user.username === username) ?? null;
}

export function findUserByEmail(email: string) {
  return authStore.users.find((user) => user.email === email) ?? null;
}

export function createUser({
  username,
  email,
  password_hash,
}: {
  username: string;
  email: string;
  password_hash: string;
}) {
  const user: UserRecord = {
    id: crypto.randomUUID(),
    username,
    email,
    password_hash,
  };

  authStore.users.push(user);
  return user;
}

export function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");

  authStore.sessions.push({
    id: crypto.randomUUID(),
    user_id: userId,
    token,
  });

  return token;
}

export function getUserFromSession(token: string) {
  const session = authStore.sessions.find((entry) => entry.token === token);
  if (!session) return null;

  return authStore.users.find((user) => user.id === session.user_id) ?? null;
}