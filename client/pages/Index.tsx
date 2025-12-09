import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Index() {
  const navigate = useNavigate();

  const handleStartChat = () => {
    navigate("/chat");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 sm:px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
          Meet Strangers
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Connect anonymously with someone new. Break the ice with AI-powered conversation starters.
        </p>

        <Button
          onClick={handleStartChat}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6"
        >
          START CHAT
        </Button>

        <div className="mt-12 pt-12 border-t border-border text-sm text-muted-foreground space-y-3">
          <div>✓ Completely Anonymous</div>
          <div>✓ AI Icebreakers</div>
          <div>✓ Real-time Chat</div>
        </div>
      </div>
    </div>
  );
}
