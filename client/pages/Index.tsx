import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  // Redirect to profile if user logged in but profile incomplete
  useEffect(() => {
    if (user && !user.isProfileComplete) {
      navigate("/profile");
    }
  }, [user, navigate]);

  const handleStartChat = () => {
    navigate("/chat");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 sm:px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
          Meet Strangers
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Connect anonymously with someone new. Break the ice with AI-powered
          conversation starters.
        </p>

        {user ? (
          <div className="space-y-4">
            <div className="mb-6 p-4 bg-card border border-border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Continue as</p>
              <p className="text-lg font-semibold text-foreground">
                {user.name}
              </p>
            </div>

            <Button
              onClick={handleStartChat}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6"
            >
              START CHAT
            </Button>

            <Button
              onClick={signOut}
              variant="outline"
              size="lg"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Continue as other user
            </Button>
          </div>
        ) : (
          <Button
            onClick={signInWithGoogle}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>
        )}

        <div className="mt-12 pt-12 border-t border-border text-sm text-muted-foreground space-y-3">
          <div>✓ Completely Anonymous</div>
          <div>✓ AI Icebreakers</div>
          <div>✓ Real-time Chat</div>
        </div>
      </div>
    </div>
  );
}
