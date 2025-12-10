import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { UserPreferences } from "@shared/auth";

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    gender: undefined,
    chatStyle: undefined,
    matchGender: "random",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!preferences.gender || !preferences.chatStyle) {
      alert("Please select both gender and chat style");
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile(preferences);
      navigate("/chat");
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 sm:px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Tell us a bit about yourself to enhance your chat experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Gender Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Gender</Label>
              <RadioGroup
                value={preferences.gender}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, gender: value as any })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="font-normal cursor-pointer">
                    Male
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label
                    htmlFor="female"
                    className="font-normal cursor-pointer"
                  >
                    Female
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal cursor-pointer">
                    Other
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="prefer-not-to-say"
                    id="prefer-not-to-say"
                  />
                  <Label
                    htmlFor="prefer-not-to-say"
                    className="font-normal cursor-pointer"
                  >
                    Prefer not to say
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Match Preference Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Who do you want to chat with?
              </Label>
              <RadioGroup
                value={preferences.matchGender}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, matchGender: value as any })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="match-male" />
                  <Label
                    htmlFor="match-male"
                    className="font-normal cursor-pointer"
                  >
                    Male
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="match-female" />
                  <Label
                    htmlFor="match-female"
                    className="font-normal cursor-pointer"
                  >
                    Female
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="random" id="match-random" />
                  <Label
                    htmlFor="match-random"
                    className="font-normal cursor-pointer"
                  >
                    Random (Any gender)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Chat Style Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Chat Style</Label>
              <p className="text-sm text-muted-foreground">
                How do you prefer to communicate?
              </p>
              <RadioGroup
                value={preferences.chatStyle}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, chatStyle: value as any })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="friendly" id="friendly" />
                  <Label
                    htmlFor="friendly"
                    className="font-normal cursor-pointer"
                  >
                    <div>
                      <div className="font-medium">Friendly</div>
                      <div className="text-sm text-muted-foreground">
                        Warm and welcoming conversations
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="casual" id="casual" />
                  <Label
                    htmlFor="casual"
                    className="font-normal cursor-pointer"
                  >
                    <div>
                      <div className="font-medium">Casual</div>
                      <div className="text-sm text-muted-foreground">
                        Relaxed and easygoing chats
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="professional" id="professional" />
                  <Label
                    htmlFor="professional"
                    className="font-normal cursor-pointer"
                  >
                    <div>
                      <div className="font-medium">Professional</div>
                      <div className="text-sm text-muted-foreground">
                        Respectful and thoughtful dialogue
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fun" id="fun" />
                  <Label htmlFor="fun" className="font-normal cursor-pointer">
                    <div>
                      <div className="font-medium">Fun</div>
                      <div className="text-sm text-muted-foreground">
                        Playful and entertaining interactions
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={
                loading || !preferences.gender || !preferences.chatStyle
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue to Chat"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
