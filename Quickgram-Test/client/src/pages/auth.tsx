import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"phone" | "verification" | "password">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) {
      setStep("verification");
    } else {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const fullPhone = countryCode + phone;
      const response = await apiRequest("POST", "/api/auth/verify", {
        phone: fullPhone,
        code: verificationCode,
        password: step === "password" ? password : undefined,
      });

      const { user } = await response.json();

      if (!response.ok) {
        if (user.requiresPassword) {
          setStep("password");
          setIsLoading(false);
          return;
        }
        throw new Error(user.message || "Verification failed");
      }

      // Store user data
      localStorage.setItem("telegramUser", JSON.stringify(user));

      toast({
        title: "Success",
        description: "Successfully logged in!",
      });

      setLocation("/telegram");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Invalid verification code. Please enter 22222",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-[var(--telegram-blue)] rounded-full mx-auto mb-4 flex items-center justify-center">
            <Send className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Telegram Clone</CardTitle>
          <CardDescription>
            {step === "phone" 
              ? "Please confirm your country code and enter your phone number."
              : step === "verification"
              ? "Please enter the verification code sent to your phone."
              : "Please enter your password"
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex mt-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+1">+1</SelectItem>
                      <SelectItem value="+888">+888</SelectItem>
                      <SelectItem value="+7">+7</SelectItem>
                      <SelectItem value="+44">+44</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="123 456 7890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="ml-2 flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use +888 prefix for anonymous numbers
                </p>
              </div>

              <Button type="submit" className="w-full bg-[var(--telegram-blue)] hover:bg-[var(--telegram-light-blue)]">
                Continue
              </Button>
            </form>
          ) : step === "verification" ? (
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div>
                <Label htmlFor="verification">Verification Code</Label>
                <Input
                  id="verification"
                  type="text"
                  placeholder="Enter code (22222)"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter 22222 as verification code
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[var(--telegram-blue)] hover:bg-[var(--telegram-light-blue)]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[var(--telegram-blue)] hover:bg-[var(--telegram-light-blue)]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}