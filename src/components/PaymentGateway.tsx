import { useState } from 'react';

interface PaymentGatewayProps {
  storyTitle: string;
  storySlug: string;
  previewContent?: string;
}

type PaymentStep = 'locked' | 'checkout' | 'processing' | 'success' | 'error';

export function PaymentGateway({ storyTitle, storySlug, previewContent }: PaymentGatewayProps) {
  const [step, setStep] = useState<PaymentStep>('locked');
  const [errorMsg, setErrorMsg] = useState('');

  // NOTE: STRIPE_PUBLIC_KEY must be set via .env — never hardcode
  // const stripe = useStripe(); // Integrate when @stripe/stripe-js is installed

  function handleSubscribe() {
    setStep('checkout');
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setStep('processing');

    // Simulated payment flow — replace with real Stripe integration
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Stub: always succeeds in demo
    const success = true;

    if (success) {
      setStep('success');
    } else {
      setErrorMsg('付款失敗，請檢查您的卡片資訊。');
      setStep('error');
    }
  }

  if (step === 'success') {
    return (
      <div className="access-gate" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✓</div>
        <h3 className="access-gate-title" style={{ marginBottom: '0.5rem' }}>
          解鎖成功
        </h3>
        <p className="access-gate-desc">正在載入機密內容...</p>
        <script dangerouslySetInnerHTML={{ __html: `
          setTimeout(() => window.location.reload(), 1000);
        `}} />
      </div>
    );
  }

  if (step === 'checkout') {
    return (
      <div className="access-gate">
        {previewContent && (
          <div className="content-blur" aria-hidden="true">
            <p>{previewContent}</p>
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 1, padding: '2rem', textAlign: 'center' }}>
          <div className="access-gate-icon">🔐</div>
          <h3 className="access-gate-title">訂閱以解鎖《{storyTitle}》</h3>
          <p className="access-gate-desc">
            此為最高機密文件，需要付費才能存取。
          </p>
          <form onSubmit={handlePay} style={{ maxWidth: '320px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <label
                htmlFor="card-element"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                  fontFamily: "'Share Tech Mono', monospace",
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                付款資訊
              </label>
              {/* Stripe Card Element mounts here */}
              <div
                id="card-element"
                style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text)',
                  fontSize: '0.875rem',
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                {/* Demo placeholder */}
                <span style={{ color: 'var(--text-muted)' }}>4242 4242 4242 4242</span>
              </div>
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '0.875rem',
                cursor: 'pointer',
                letterSpacing: '0.1em',
                transition: 'opacity 0.2s',
              }}
              disabled={step === 'processing'}
            >
              {step === 'processing' ? '處理中...' : '[ 確認訂閱 NT$99/月 ]'}
            </button>
            {errorMsg && (
              <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                {errorMsg}
              </p>
            )}
            <button
              type="button"
              onClick={() => setStep('locked')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                marginTop: '0.75rem',
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              取消
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Default: locked state
  return (
    <div className="access-gate">
      {previewContent && (
        <div className="content-blur" aria-hidden="true">
          <p>{previewContent}</p>
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 1, padding: '2rem', textAlign: 'center' }}>
        <div className="access-gate-icon">🔒</div>
        <h3 className="access-gate-title">機密內容</h3>
        <p className="access-gate-desc">
          《{storyTitle}》為付費限定文章。<br />
          訂閱以解鎖全部最高機密卷宗。
        </p>
        <button
          onClick={handleSubscribe}
          style={{
            padding: '0.75rem 2rem',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '0.875rem',
            cursor: 'pointer',
            letterSpacing: '0.1em',
          }}
        >
          [ 訂閱解鎖 ]
        </button>
        <p style={{
          marginTop: '0.75rem',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontFamily: "'Share Tech Mono', monospace",
        }}>
          NT$99/月 · 隨時取消
        </p>
      </div>
    </div>
  );
}
