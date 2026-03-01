import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[RouteErrorBoundary]', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      const isDev = import.meta.env?.DEV;
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6 border border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Algo deu errado ao carregar esta página
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Tente novamente. Se o problema continuar, verifique o console do navegador para mais detalhes.
            </p>
            {isDev && this.state.error?.message && (
              <pre className="text-left text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-32 text-red-600 dark:text-red-400">
                {this.state.error.message}
              </pre>
            )}
            <Button
              onClick={this.handleRetry}
              className="flex items-center justify-center gap-2 mx-auto"
              type="button"
            >
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
