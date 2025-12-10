import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, Send } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Message {
  id: string;
  senderId: string;
  message: string;
  timestamp: number;
}

export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSearching, setIsSearching] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [strangerTyping, setStrangerTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize Socket.io connection
  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const socketUrl = import.meta.env.DEV
      ? "http://localhost:8080"
      : window.location.origin;
    const newSocket = io(socketUrl, {
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setIsConnected(true);
      setSocket(newSocket);

      // Join queue immediately
      newSocket.emit("join_queue", { userId: user.id });
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("searching", (data: { queuePosition: number }) => {
      console.log("Still searching, queue position:", data.queuePosition);
    });

    newSocket.on(
      "match_found",
      (data: { sessionId: string; icebreakers: string[] }) => {
        console.log("Match found!", data);
        setIsSearching(false);
        setSessionId(data.sessionId);
        setIcebreakers(data.icebreakers || []);

        // Join the session room
        newSocket.emit("join_session", { sessionId: data.sessionId });
      },
    );

    newSocket.on("new_message", (messageData: Message) => {
      console.log("New message:", messageData);
      setMessages((prev) => [...prev, messageData]);
    });

    newSocket.on("stranger_typing", (data: { isTyping: boolean }) => {
      setStrangerTyping(data.isTyping);
    });

    newSocket.on("stranger_left", () => {
      alert("Stranger left the chat. Finding you a new match...");
      // Reset state
      setMessages([]);
      setSessionId(null);
      setIcebreakers([]);
      setIsSearching(true);

      // Rejoin queue
      newSocket.emit("join_queue", { userId: user.id });
    });

    newSocket.on("stranger_disconnected", () => {
      alert("Stranger disconnected. Finding you a new match...");
      setMessages([]);
      setSessionId(null);
      setIcebreakers([]);
      setIsSearching(true);

      newSocket.emit("join_queue", { userId: user.id });
    });

    newSocket.on("error", (data: { message: string }) => {
      console.error("Socket error:", data.message);
      alert(data.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, navigate]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || !socket || !sessionId) return;

    socket.emit("send_message", {
      sessionId,
      message: text,
    });

    setInputValue("");
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (!socket || !sessionId) return;

    // Send typing indicator
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      socket.emit("typing", { sessionId, isTyping: true });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("typing", { sessionId, isTyping: false });
    }, 1000);
  };

  const handleSkip = () => {
    if (!socket) return;

    socket.emit("leave_session");
    setMessages([]);
    setSessionId(null);
    setIcebreakers([]);
    setIsSearching(true);

    // Find new match
    if (user) {
      socket.emit("join_queue", { userId: user.id });
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium">Connecting to server...</p>
        </Card>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="p-8 text-center max-w-md">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-2xl font-bold mb-2">Finding you a match...</h2>
          <p className="text-gray-600">
            Looking for someone interesting to chat with 🔍
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Anonymous Chat
          </h1>
          <p className="text-xs text-muted-foreground">
            Connected with stranger • {messages.length} messages
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          Exit
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg text-foreground font-medium">
                Match found! 🎉
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Say hi or use an icebreaker below
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === user?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl break-words ${
                    message.senderId === user?.id
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-card text-card-foreground rounded-bl-none border border-border"
                  }`}
                >
                  <p className="text-sm sm:text-base">{message.message}</p>
                </div>
              </div>
            ))}
            {strangerTyping && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-card border border-border">
                  <p className="text-sm text-muted-foreground italic">
                    Stranger is typing...
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Icebreaker Pills */}
      {icebreakers.length > 0 && (
        <div className="px-4 py-4 border-t border-border space-y-2 bg-card/50">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            💡 AI-powered conversation starters:
          </p>
          <div className="flex flex-wrap gap-2">
            {icebreakers.map((suggestion, index) => (
              <Button
                key={index}
                onClick={() => handleSend(suggestion)}
                variant="outline"
                size="sm"
                className="text-sm hover:bg-primary hover:text-primary-foreground"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border px-4 py-4 bg-card/50">
        <div className="flex gap-2 mb-3">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!inputValue.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={handleSkip} variant="outline" className="w-full">
          Skip & Find New Match
        </Button>
      </div>
    </div>
  );
}
