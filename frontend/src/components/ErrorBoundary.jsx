import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Oops! Something went wrong.</h2>
          <p>We're sorry, an unexpected error occurred.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              cursor: 'pointer',
              marginTop: '1rem',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Refresh Page
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre
              style={{
                textAlign: 'left',
                backgroundColor: '#1e1e1e',
                color: '#f87171',
                padding: '1rem',
                marginTop: '2rem',
                overflowX: 'auto',
                borderRadius: '8px',
              }}
            >
              {this.state.error.toString()}
              <br />
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
