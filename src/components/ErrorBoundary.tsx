import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-display mb-2">Kaut kas nogāja greizi</h1>
            <p className="text-muted-foreground font-body mb-6 text-sm">
              Notikusi neparedzēta kļūda. Lūdzu, mēģiniet vēlreiz.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Mēģināt vēlreiz
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                style={{ background: "var(--gradient-brand)" }}
              >
                Uz sākumlapu
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}