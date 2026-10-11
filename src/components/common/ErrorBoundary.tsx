import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Catches render errors so one broken page shows a message instead of a blank screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-sm">
        <h2 className="font-display text-lg text-red-700">Something went wrong on this page</h2>
        <p className="mt-2 break-words text-red-700">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-4 rounded-lg bg-chalkboard px-4 py-2 text-chalk"
        >
          Try again
        </button>
      </div>
    );
  }
}
