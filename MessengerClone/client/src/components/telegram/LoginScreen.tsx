import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useTelegram } from "@/hooks/useTelegram";
import { useToast } from "@/hooks/use-toast";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, verifyCode } = useTelegram();
  const { toast } = useToast();

  const handleSendCode = async () => {
    if (phone.length < 10) {
      toast({
        title: "Ошибка",
        description: "Введите корректный номер телефона",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(phone);
      setShowCodeInput(true);
      toast({
        title: "Код отправлен",
        description: "Введите код подтверждения (22222)",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить код",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length < 4) {
      toast({
        title: "Ошибка",
        description: "Введите код подтверждения",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await verifyCode(phone, code);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Неверный код. Используйте 22222",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (showCodeInput) {
        handleVerifyCode();
      } else {
        handleSendCode();
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
      <Card className="w-full max-w-md mx-4 fade-in">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 telegram-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.789L24 5.562c.321-1.288-.492-1.858-1.335-1.845z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Telegram</h1>
            <p className="text-gray-600">Войдите в свой аккаунт</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2">
                Номер телефона
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={showCodeInput}
                className="transition-all duration-200"
                autoFocus
              />
            </div>
            
            {showCodeInput && (
              <div className="slide-in-left">
                <Label htmlFor="code" className="text-sm font-medium text-gray-700 mb-2">
                  Код подтверждения
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Введите код (22222)"
                  maxLength={5}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-center text-lg tracking-widest transition-all duration-200"
                  autoFocus
                />
                <p className="text-sm text-gray-500 mt-2">
                  Мы отправили код на ваш номер
                </p>
              </div>
            )}
            
            <Button
              onClick={showCodeInput ? handleVerifyCode : handleSendCode}
              className="w-full telegram-blue hover:telegram-light-blue text-white py-3 font-medium transition-all duration-200 transform hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? "Загрузка..." : showCodeInput ? "Войти" : "Отправить код"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
