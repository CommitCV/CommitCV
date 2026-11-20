import { Component, type ReactNode } from "react";
import { trackJavaScriptError } from "@analytics/tracker";
import Button from "@components/ui/button";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Top-level application error boundary.
 * Catches unhandled React render errors, tracks the crash anonymously,
 * and displays a recoverable fallback interface.
 */
export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    override componentDidCatch(error: Error): void {
        trackJavaScriptError(error);
    }

    private handleReload = () => {
        window.location.reload();
    };

    override render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-light-100 text-light-950 dark:bg-dark-100 dark:text-dark-950">
                    <div className="max-w-md rounded-lg border border-border-light bg-light-50 p-6 shadow-sm dark:border-border-dark dark:bg-dark-200">
                        <h1 className="text-xl font-bold mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-sm text-light-700 dark:text-dark-700 mb-6">
                            An unexpected application error occurred. No resume
                            content was compromised.
                        </p>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={this.handleReload}>
                            Reload application
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
