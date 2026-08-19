'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { api } from '@/lib/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentFormProps {
  requestId: number;
  amount: number;
  paymentIntentId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentForm({
  requestId,
  paymentIntentId,
  onSuccess,
  onCancel,
  amount,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    // Validate the payment element
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Validation failed');
      setProcessing(false);
      return;
    }

    try {
      // Confirm payment with Stripe
      const response = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/customer/bookings`,
        },
        redirect: 'if_required',
      });

      if (response.error) {
        setError(response.error.message || 'Payment failed. Please try again.');
        setProcessing(false);
        return;
      }

      if (response.paymentIntent?.status === 'succeeded') {
        // Notify our backend to update order status & credit supplier wallet
        try {
          await api.post('/payments/confirm-success', {
            requestId,
            paymentIntentId: response.paymentIntent.id || paymentIntentId,
          });
        } catch (confirmErr) {
          console.error('Backend confirm-success failed:', confirmErr);
          // Still call onSuccess — the Stripe webhook will catch it as fallback
        }
        onSuccess();
      } else {
        setError('Payment status unclear. Please contact support if you were charged.');
        setProcessing(false);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <PaymentElement />
      </div>

      {error && (
        <div style={{
          color: '#ef4444',
          fontSize: '0.875rem',
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          border: '1px solid #fecaca',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          style={{
            flex: 1,
            padding: '0.875rem',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.9375rem',
            cursor: processing ? 'not-allowed' : 'pointer',
            opacity: processing ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          style={{
            flex: 2,
            padding: '0.875rem',
            backgroundColor: processing ? '#6ee7b7' : '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.9375rem',
            cursor: (!stripe || processing) ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {processing ? (
            <>
              <svg
                style={{ animation: 'spin 1s linear infinite', width: '18px', height: '18px' }}
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              >
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </>
          ) : (
            `Pay $${(amount / 100).toFixed(2)}`
          )}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}

interface StripePaymentProps {
  requestId: number;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripePayment(props: StripePaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIntent() {
      try {
        const response = await api.post<{ clientSecret: string; paymentIntentId: string }>(
          '/payments/create-intent',
          { requestId: props.requestId }
        );
        if (response.success && response.data?.clientSecret) {
          setClientSecret(response.data.clientSecret);
          setPaymentIntentId(response.data.paymentIntentId || '');
        } else {
          setInitError((response as any).message || 'Failed to initialize payment');
        }
      } catch (err: any) {
        setInitError(err.message || 'Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    }
    fetchIntent();
  }, [props.requestId]);

  // Overlay — scrollable, centered on desktop, aligned top on mobile
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1.5rem 1rem',
    overflowY: 'auto',
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
    // No fixed height — grows with content, scrollable via the overlay
    marginTop: 'auto',
    marginBottom: 'auto',
  };

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...panelStyle, padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '44px', height: '44px',
            border: '4px solid #d1fae5',
            borderTopColor: '#10B981',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1.25rem',
          }} />
          <p style={{ color: '#374151', fontWeight: 600 }}>Initializing secure payment…</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (initError || !clientSecret) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...panelStyle, padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
              Payment Unavailable
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {initError || 'Could not initialize payment. Please try again.'}
            </p>
          </div>
          <button
            onClick={props.onCancel}
            style={{
              width: '100%', padding: '0.875rem',
              backgroundColor: '#f3f4f6', color: '#374151',
              border: 'none', borderRadius: '10px',
              fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) props.onCancel(); }}>
      <div style={panelStyle}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 1.5rem 0',
          borderBottom: '1px solid #f3f4f6',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                Secure Payment
              </h2>
            </div>
            <button
              onClick={props.onCancel}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: '#f3f4f6', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6b7280', fontSize: '1.125rem', lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '0.875rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: '#374151', fontSize: '0.875rem' }}>Order #{props.requestId}</span>
            <span style={{ color: '#059669', fontWeight: 800, fontSize: '1.25rem' }}>
              ${(props.amount / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment form */}
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#10B981' } } }}>
            <PaymentForm
              requestId={props.requestId}
              amount={props.amount}
              paymentIntentId={paymentIntentId}
              onSuccess={props.onSuccess}
              onCancel={props.onCancel}
            />
          </Elements>

          <div style={{
            marginTop: '1.25rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            Secured by Stripe. Your payment info is encrypted.
          </div>
        </div>
      </div>
    </div>
  );
}
