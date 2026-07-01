import React from 'react';

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  public state = { hasError: false, error: null };
  constructor(props: {children: React.ReactNode}) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '20px', color: 'red', background: '#000', minHeight: '100vh'}}>
          <h1>Something went wrong.</h1>
          <pre style={{whiteSpace: 'pre-wrap'}}>{this.state.error?.toString()}</pre>
          <pre style={{whiteSpace: 'pre-wrap', marginTop: '20px'}}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}
