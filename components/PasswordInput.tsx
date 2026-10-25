'use client';

import { type InputHTMLAttributes, useState } from 'react';

export default function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative w-full">
      <input {...props} type={visible ? 'text' : 'password'} style={{ ...props.style, paddingRight: 42 }} />
      <button
        type="button"
        onClick={() => setVisible(value => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500"
      >
        {visible ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.5 4.5 9 6.5a9.7 9.7 0 0 1-2.1 3.8M6.6 6.6A10.3 10.3 0 0 0 3 10.5C3.5 12.5 7 17 12 17a10 10 0 0 0 3-.5" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5C3.5 8.5 7 4 12 4s8.5 4.5 9 6.5c-.5 2-4 6.5-9 6.5s-8.5-4.5-9-6.5Z" />
            <circle cx="12" cy="10.5" r="2.5" />
          </svg>
        )}
      </button>
    </div>
  );
}
