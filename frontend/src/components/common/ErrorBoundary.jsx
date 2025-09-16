import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }

    // You could also log the error to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: FallbackComponent, onReset } = this.props;

      // Use custom fallback if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.handleReset}
            onReset={onReset}
          />
        );
      }

      // Default error UI
      return (
        <div className="min-h-96 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              {this.props.errorMessage ||
                'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.'}
            </p>
            <button
              onClick={() => {
                this.handleReset();
                if (onReset) onReset();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different sections
export const GameSectionErrorBoundary = ({ children, sectionName = 'section' }) => (
  <ErrorBoundary
    errorMessage={`There was a problem loading the ${sectionName}. Please try refreshing the page.`}
  >
    {children}
  </ErrorBoundary>
);

export const ModalErrorBoundary = ({ children, onReset }) => (
  <ErrorBoundary
    errorMessage="There was a problem with this dialog. Please close and try again."
    onReset={onReset}
  >
    {children}
  </ErrorBoundary>
);

// Simple error fallback components
export const SimpleErrorFallback = ({ error, resetError }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="text-sm font-medium text-red-800">
          Something went wrong
        </h3>
        <p className="text-sm text-red-700 mt-1">
          Unable to load this content. Please try again.
        </p>
      </div>
      <button
        onClick={resetError}
        className="text-red-600 hover:text-red-800 text-sm underline"
      >
        Retry
      </button>
    </div>
  </div>
);

export const InlineErrorFallback = ({ error, resetError, message = 'Error loading content' }) => (
  <div className="flex items-center gap-2 text-red-600 text-sm">
    <AlertTriangle className="w-4 h-4" />
    <span>{message}</span>
    <button
      onClick={resetError}
      className="text-red-600 hover:text-red-800 underline ml-2"
    >
      Retry
    </button>
  </div>
);

export default ErrorBoundary;