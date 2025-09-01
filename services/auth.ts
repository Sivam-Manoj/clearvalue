import API from '@/lib/api';
import { clearTokens, setTokens } from '@/lib/auth-storage';
import { setCookie, deleteCookie } from '@/lib/cookies';

export type SignupPayload = {
  email: string;
  password: string;
  username?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyAddress?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type VerifyEmailPayload = {
  email: string;
  verificationCode: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
};

export type AuthUser = {
  _id: string;
  email: string;
  username?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyAddress?: string;
  isVerified?: boolean;
  authProvider?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const AuthService = {
  async signup(payload: SignupPayload): Promise<{ message: string }> {
    const { data } = await API.post<{ message: string }>('/auth/signup', payload);
    return data;
  },

  async login(payload: LoginPayload): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    const { data } = await API.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
      '/auth/login',
      payload,
    );
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    // mark session for middleware
    setCookie('cv_auth', '1', 7);
    return data;
  },

  async verifyEmail(payload: VerifyEmailPayload): Promise<{ message: string }> {
    const { data } = await API.post<{ message: string }>('/auth/verify-email', payload);
    return data;
  },

  async resendVerificationCode(email: string): Promise<{ message: string }> {
    const { data } = await API.post<{ message: string }>('/auth/resend-verification-code', { email });
    return data;
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    const { data } = await API.post<{ message: string }>('/auth/forgot-password', payload);
    return data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string; accessToken?: string; refreshToken?: string }> {
    const { data } = await API.post<{ message: string; accessToken?: string; refreshToken?: string }>(
      `/auth/reset-password/${payload.token}`,
      { password: payload.password },
    );
    if (data.accessToken && data.refreshToken) {
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setCookie('cv_auth', '1', 7);
    }
    return data;
  },

  async logout() {
    clearTokens();
    deleteCookie('cv_auth');
  },
};
