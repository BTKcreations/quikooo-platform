import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          role="alert"
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '0.75rem',
            margin: '1.5rem auto',
            maxWidth: '500px',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#991B1B', fontSize: '1.15rem' }}>
            Unable to render this view
          </h3>
          <p style={{ margin: '0 0 1.25rem 0', color: '#B91C1C', fontSize: '0.875rem' }}>
            {this.state.error?.message || 'An unexpected error occurred. Tap below to retry.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="btn-primary"
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              backgroundColor: '#DC2626',
              borderColor: '#DC2626',
              minHeight: '44px',
            }}
          >
            Retry View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
