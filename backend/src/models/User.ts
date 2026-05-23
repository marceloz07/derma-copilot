import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { UserRole } from '../types';

// ── Modelo en memoria (reemplazar con ORM real: Prisma, TypeORM, Mongoose) ────
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Simulación de BD en memoria — reemplazar con acceso real a BD
const usersDb = new Map<string, User>();

let idCounter = 1;

export const UserModel = {
  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_SALT_ROUNDS);
    const user: User = {
      ...data,
      password: hashedPassword,
      id: String(idCounter++),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersDb.set(user.id, user);
    return user;
  },

  async findById(id: string): Promise<User | null> {
    return usersDb.get(id) ?? null;
  },

  async findByEmail(email: string): Promise<User | null> {
    for (const user of usersDb.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) return user;
    }
    return null;
  },

  async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  },

  async updatePassword(userId: string, newHashedPassword: string): Promise<boolean> {
    const user = usersDb.get(userId);
    if (!user) return false;
    usersDb.set(userId, { ...user, password: newHashedPassword, updatedAt: new Date() });
    return true;
  },

  // Omite la contraseña al devolver el usuario
  sanitize(user: User): Omit<User, 'password'> {
    const { password: _password, ...safe } = user;
    return safe;
  },
};
