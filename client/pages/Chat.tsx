import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

const ICEBREAKER_SUGGESTIONS = [
  "Do you believe in ghosts?",
  "What's your favorite movie?",
  "If you could travel anywhere, where would it be?",
  "What's your hidden talent?",
  "Do you prefer coffee or tea?",
  "What's the best advice you've received?",
];

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSearching, setIsSearching] = useState(true);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSearching(false);
      const shuffled = ICEBREAKER_SUGGESTIONS.sort(() => Math.random() - 0.5);
      setIcebreakers(shuffled.slice(0, 3));
      
      setMessages([
        {
          id: "1",
          text: "Hey there! 👋",
          isUser: false,
          timestamp: Date.now(),
        },
      ]);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    setTimeout(() => {
      const randomResponse = [
        "That's interesting! Tell me more...",
        "I totally agree with you 😄",
        "Wow, never thought about it that way",
        "Haha, that's cool! Do you do that often?",
      ];
      const response: Message = {
        id: Date.now().toString(),
        text: randomResponse[Math.floor(Math.random() * randomResponse.length)],
        isUser: false,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, response]);
    }, 500);
  };

  const handleIcebreakerClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleNext = () => {
    setMessages([]);
    setInputValue("");
    setIsSearching(true);
    setIcebreakers([]);

    const timer = setTimeout(() => {
      setIsSearching(false);
      const shuffled = ICEBREAKER_SUGGESTIONS.sort(() => Math.random() - 0.5);
      setIcebreakers(shuffled.slice(0, 3));
      
      setMessages([
        {
          id: "1",
          text: "Hello! How's it going? 😊",
          isUser: false,
          timestamp: Date.now(),
        },
      ]);
    }, 2000);

    return () => clearTimeout(timer);
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Anonymous Chat</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGoHome}
          className="text-muted-foreground hover:text-foreground"
        >
          Exit
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0">
        {isSearching ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block mb-4">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
              <p className="text-lg text-foreground font-medium">Searching for a match...</p>
              <p className="text-sm text-muted-foreground mt-2">Finding someone awesome for you</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl break-words ${
                    message.isUser
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-card text-card-foreground rounded-bl-none border border-border"
                  }`}
                >
                  <p className="text-sm sm:text-base">{message.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Icebreaker Chips */}
      {!isSearching && icebreakers.length > 0 && (
        <div className="px-4 py-4 border-t border-border space-y-2 bg-card/50">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Don't know what to say? Try these:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {icebreakers.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleIcebreakerClick(suggestion)}
                className="text-left p-3 rounded-lg bg-background hover:bg-background/80 border border-primary/30 hover:border-primary transition-colors text-sm text-foreground hover:text-primary group"
              >
                <span className="flex items-start gap-2">
                  <Plus className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary/50 group-hover:text-primary" />
                  <span className="flex-1">{suggestion}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      {!isSearching && (
        <div className="border-t border-border px-4 py-4 bg-card/50 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage(inputValue);
                }
              }}
              placeholder="Type your message..."
              className="flex-1 bg-background border border-border rounded-full px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Button
              onClick={() => handleSendMessage(inputValue)}
              size="icon"
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            onClick={handleNext}
            variant="outline"
            className="w-full text-foreground border-border hover:bg-background/50"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Next Person
          </Button>
        </div>
      )}
    </div>
  );
}
