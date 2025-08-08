import API from '@/lib/api';
import type { AuthUser } from './auth';

export const UserService = {
  async getMe(): Promise<AuthUser> {
    const { data } = await API.get<AuthUser>('/user/me');
    return data;
  },

  async deleteAccount(password?: string): Promise<{ message: string }> {
    const body = password ? { password } : undefined;
    if (body) {
      const { data } = await API.delete<{ message: string }>('/user', { data: body });
      return data;
    }
    const { data } = await API.delete<{ message: string }>('/user');
    return data;
  },
};
