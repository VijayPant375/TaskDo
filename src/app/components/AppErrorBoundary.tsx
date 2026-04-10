import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TaskDo UI crashed.', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 w-fit rounded-full bg-destructive/10 p-4 text-destructive">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The app hit an unexpected error. Reload to get back to your workspace.
            </p>
            <Button className="mt-6 w-full" onClick={() => window.location.reload()}>
              Reload TaskDo
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
