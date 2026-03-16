import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, send to error monitoring service
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          style={{
            padding: '2rem',
            border: '1px solid var(--danger)',
            background: 'var(--surface)',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <p style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '0.8rem',
            color: 'var(--danger)',
            marginBottom: '0.5rem',
          }}>
            [ 系統錯誤 · COMPONENT_FAILURE ]
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'Share Tech Mono', monospace" }}>
            {import.meta.env.DEV ? this.state.errorMessage : '請重新整理頁面或聯繫系統管理員。'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '0.75rem',
            }}
          >
            [ 重試 ]
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
