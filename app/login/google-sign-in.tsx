'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(
            element: HTMLElement,
            options: Record<string, unknown>,
          ): void;
        };
      };
    };
  }
}

export function GoogleSignIn({
  clientId,
  returnTo,
}: {
  clientId: string;
  returnTo: string;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const render = () => {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setWorking(true);
          setMessage('');
          const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
          });
          if (response.ok) window.location.assign(returnTo);
          else {
            setWorking(false);
            setMessage('로그인을 완료하지 못했습니다. 다시 시도해 주세요.');
          }
        },
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 320,
        locale: 'ko',
      });
    };
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity]',
    );
    if (existing) {
      if (window.google) render();
      else existing.addEventListener('load', render, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.addEventListener('load', render, { once: true });
    document.head.appendChild(script);
  }, [clientId, returnTo]);

  if (!clientId)
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        Google 로그인 설정을 불러오지 못했습니다.
      </p>
    );
  return (
    <div className="space-y-3">
      <div
        ref={buttonRef}
        className={working ? 'pointer-events-none opacity-50' : ''}
      />
      {working && (
        <p className="flex items-center justify-center gap-2 text-sm text-[#5F6E63]">
          <LoaderCircle className="size-4 animate-spin" /> 계정을 확인하고
          있습니다.
        </p>
      )}
      {message && <p className="text-center text-sm text-red-700">{message}</p>}
    </div>
  );
}
