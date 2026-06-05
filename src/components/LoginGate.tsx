/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { apiJson } from '../lib/api';

interface LoginGateProps {
  children: React.ReactNode;
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export default function LoginGate({ children }: LoginGateProps) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkSession = async () => {
    try {
      const data = await apiJson<{ authenticated: boolean }>('/api/auth/me');
      setAuthState(data.authenticated ? 'authenticated' : 'unauthenticated');
    } catch {
      setAuthState('unauthenticated');
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setAuthState('authenticated');
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#5A5A40] animate-spin" />
        <p className="text-xs text-[#8C8479]">正在验证访问权限…</p>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white rounded-2xl border border-[#EBE3D9] p-6 shadow-sm space-y-4"
        >
          <div className="text-center space-y-1">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#5A5A40]/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#5A5A40]" />
            </div>
            <h1 className="text-lg font-bold font-serif text-[#2B2B20]">Mirrorly</h1>
            <p className="text-xs text-[#8C8479]">私人认知镜像 · 请输入访问密码</p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="访问密码"
            autoComplete="current-password"
            className="w-full px-4 py-2.5 rounded-xl border border-[#EBE3D9] bg-[#FDFCFB] text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
          />

          {error && (
            <p className="text-xs text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full py-2.5 rounded-xl bg-[#5A5A40] hover:bg-[#444430] text-white text-sm font-medium disabled:opacity-50"
          >
            {submitting ? '验证中…' : '进入'}
          </button>

          <p className="text-[10px] text-center text-[#8C8479] leading-relaxed">
            密码由服务端环境变量 MIRRORLY_PASSWORD 配置，仅您本人使用。
          </p>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
