import { Component, ErrorInfo, ReactNode } from 'react';

/** Catches render errors so a single broken component doesn't white-screen
 *  the entire app. Logs to console; shows a recovery UI with a reload button. */
type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Render error caught by ErrorBoundary:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fixed inset-0 bg-bg flex items-center justify-center p-6">
        <div className="card max-w-md p-6 text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h1 className="font-display text-xl font-bold mb-2">Something broke</h1>
          <p className="text-sm text-ink-dim mb-4">
            The app hit an unexpected error. Your balance and seeds are saved — try
            reloading.
          </p>
          <pre className="text-[11px] text-left text-ink-mute bg-bg-elev rounded p-2 mb-4 overflow-auto max-h-32">
            {this.state.error.message}
          </pre>
          <div className="flex gap-2">
            <button onClick={this.handleHome} className="btn-ghost flex-1">
              Lobby
            </button>
            <button onClick={this.handleReload} className="btn-primary flex-1">
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
