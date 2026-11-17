import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { nhost } from '../services/nhostClient';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by Shops ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      nhost.auth.signOut({ all: false }).catch(() => {});
      nhost.sessionStorage.remove();
    } catch {
      // Ignore cleanup error
    }
    window.location.href = window.location.origin;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-neutral-950 text-white flex items-center justify-center p-4 font-sans">
          <div className="max-w-lg w-full rounded-[24px] bg-[#FAF9F6] text-[#0F1115] p-6 sm:p-8 space-y-4 shadow-2xl border border-black/20 animate-panel-in">
            <div className="flex items-center gap-3 text-[#D93200]">
              <AlertCircle className="w-8 h-8 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="font-serif text-xl font-bold tracking-tight text-[#0F1115]">
                  Something went wrong loading Shop Dispatch
                </h2>
                <p className="text-xs text-neutral-600 font-sans mt-0.5">
                  The Prinrox Partner portal caught a display exception.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/5 border border-black/10 text-xs font-mono text-neutral-800 max-h-48 overflow-y-auto">
              <div className="font-bold text-rose-700">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown runtime error'}
              </div>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-neutral-600 mt-2 whitespace-pre-wrap font-mono">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:flex-1 h-11 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-sans font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 h-11 rounded-full bg-[#D93200] hover:bg-[#FF3B00] text-white text-xs font-sans font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign Out &amp; Return to Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
