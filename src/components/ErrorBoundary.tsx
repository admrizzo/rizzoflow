import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

// List of DOM errors that are cosmetic and should not crash the app
const IGNORABLE_DOM_ERRORS = [
  "Failed to execute 'removeChild' on 'Node'",
  "Failed to execute 'insertBefore' on 'Node'",
  "The node to be removed is not a child of this node",
];

function isIgnorableDOMError(error: Error): boolean {
  if (!error?.message) return false;
  return IGNORABLE_DOM_ERRORS.some(msg => error.message.includes(msg));
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ label?: string }>,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Don't crash the app for cosmetic DOM errors from Radix UI portals
    if (isIgnorableDOMError(error)) {
      // Return null to not update state - this prevents re-renders
      return { hasError: false };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log cosmetic DOM errors as warnings, not crashes
    if (isIgnorableDOMError(error)) {
      console.warn('[ErrorBoundary] Cosmetic DOM error (ignored):', error.message);
      return;
    }
    
    // Keeps this lightweight but makes crashes visible in production logs.
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, {
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    // Most reliable recovery for runtime crashes.
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="w-full max-w-md rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Ops, ocorreu um erro</h1>
            <p className="text-sm text-muted-foreground">
              A tela ficou em branco porque algo falhou na aplicação. Você pode recarregar para voltar.
            </p>
          </div>

          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Recarregar
          </button>

          {import.meta.env.DEV && this.state.error?.message ? (
            <pre className="text-xs bg-muted text-muted-foreground rounded p-3 overflow-auto">
              {this.state.error.message}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}
