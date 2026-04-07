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
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentForm({ onSuccess, onCancel, amount }: { onSuccess: () => void; onCancel: () => void; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Validation failed');
      setProcessing(false);
      return;
    }

    try {
      const response = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/mobile/customer/orders`,
        },
        redirect: 'if_required',
      });

      if (response.error) {
        setError(response.error.message || 'Payment failed');
      } else {
        if (response.paymentIntent.status === 'succeeded') {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during payment');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '400px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <PaymentElement />
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          type="submit"
          disabled={!stripe || processing}
          style={{
            flex: 1,
            padding: '0.75rem',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: processing ? 'not-allowed' : 'pointer',
            opacity: processing ? 0.6 : 1
          }}
        >
          {processing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function StripePayment(props: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIntent() {
      try {
        const response = await api.post<{ clientSecret: string }>('/payments/create-intent', {
          requestId: props.requestId,
        });
        if (response.success && response.data?.clientSecret) {
          setClientSecret(response.data.clientSecret);
        }
      } catch (err) {
        console.error('Failed to fetch client secret', err);
      } finally {
        setLoading(false);
      }
    }
    fetchIntent();
  }, [props.requestId]);

  if (loading || !clientSecret) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px' }}>Loading payment info...</div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '450px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>Secure Payment</h2>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#6B7280', fontSize: '0.875rem' }}>
          Complete your payment for Order #{props.requestId}
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm {...props} />
        </Elements>
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#9CA3AF' }}>
          Powered by Stripe. Your payment info is encrypted.
        </div>
      </div>
    </div>
  );
}
