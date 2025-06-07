import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, Users, Megaphone, BookMarked, Phone, Settings, 
  Moon, Sun, X, PhoneOff, Mic, MicOff, Video, VideoOff, Star,
  Upload, Zap, Palette, Heart 
} from "lucide-react";
import { useTelegram } from "@/hooks/useTelegram";
import { useToast } from "@/hooks/use-toast";

interface ModalsProps {
  showMenu: boolean;
  onCloseMenu: () => void;
  showSettings: boolean;
  onCloseSettings: () => void;
  showProfile: boolean;
  onCloseProfile: () => void;
  showCreateGroup: boolean;
  onCloseCreateGroup: () => void;
  showPremium: boolean;
  onClosePremium: () => void;
  showCall: boolean;
  onCloseCall: () => void;
  callData: any;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onShowProfile: () => void;
  onShowCreateGroup: () => void;
  onShowPremium: () => void;
  user: any;
}

export default function Modals({
  showMenu,
  onCloseMenu,
  showSettings,
  onCloseSettings,
  showProfile,
  onCloseProfile,
  showCreateGroup,
  onCloseCreateGroup,
  showPremium,
  onClosePremium,
  showCall,
  onCloseCall,
  callData,
  isDarkMode,
  onToggleTheme,
  onShowProfile,
  onShowCreateGroup,
  onShowPremium,
  user,
}: ModalsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupUsername, setGroupUsername] = useState("");
  const { toast } = useToast();

  const getAvatarFallback = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название группы",
        variant: "destructive",
      });
      return;
    }

    try {
      const sessionId = localStorage.getItem("telegram_session");
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionId}`,
        },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          username: groupUsername || undefined,
          type: "group",
        }),
      });

      if (response.ok) {
        toast({
          title: "Группа создана",
          description: `Группа "${groupName}" успешно создана!`,
        });
        
        setGroupName("");
        setGroupDescription("");
        setGroupUsername("");
        onCloseCreateGroup();
        
        // Refresh chats list
        window.location.reload();
      } else {
        throw new Error("Failed to create group");
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать группу",
        variant: "destructive",
      });
    }
  };

  const activatePremium = async () => {
    try {
      const sessionId = localStorage.getItem("telegram_session");
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionId}`,
        },
        body: JSON.stringify({
          isPremium: true,
        }),
      });

      if (response.ok) {
        toast({
          title: "Поздравляем!",
          description: "Telegram Premium активирован бесплатно!",
        });
        onClosePremium();
        // Refresh page to show premium badge
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error("Failed to activate premium");
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось активировать Premium",
        variant: "destructive",
      });
    }
  };

  // Menu Overlay
  if (showMenu) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onCloseMenu}>
        <div 
          className="w-80 h-full bg-white dark:bg-gray-800 shadow-xl slide-in-left" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.avatar} alt={user?.firstName} />
                <AvatarFallback className="telegram-blue text-white text-lg">
                  {getAvatarFallback(`${user?.firstName} ${user?.lastName || ""}`)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName || ""}
                  </h3>
                  {user?.isPremium && (
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.phone}
                </p>
              </div>
            </div>
          </div>
          
          <div className="py-2">
            <button
              onClick={onShowProfile}
              className="w-full px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3"
            >
              <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-900 dark:text-white">Мой профиль</span>
            </button>
            
            <button
              onClick={onShowCreateGroup}
              className="w-full px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3"
            >
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-900 dark:text-white">Новая группа</span>
            </button>
            
            <button 
              onClick={() => {
                onCloseMenu();
                // For now, use the same modal as groups but with channel type
                setGroupName("");
                setGroupDescription("");
                setGroupUsername("");
                onShowCreateGroup();
              }}
              className="w-full px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3"
            >
              <Megaphone className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-900 dark:text-white">Новый канал</span>
            </button>
            
            <button className="w-full px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3">
              <BookMarked className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-900 dark:text-white">Избранное</span>
            </button>
            
            <button className="w-full px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-900 dark:text-white">Звонки</span>
            </button>
            
            <button className="w-full px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3">
              <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-900 dark:text-white">Настройки</span>
            </button>
            
            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
              <button
                onClick={onToggleTheme}
                className="w-full px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3"
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                )}
                <span className="text-gray-900 dark:text-white">
                  {isDarkMode ? "Светлая тема" : "Тёмная тема"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={onCloseSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Настройки
              <Button variant="ghost" size="icon" onClick={onCloseSettings}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Уведомления</span>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <span>Автозагрузка медиа</span>
              <Switch defaultChecked />
            </div>
            
            <Button
              onClick={onShowPremium}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <Star className="h-4 w-4 mr-2" />
              Telegram Premium
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      <Dialog open={showProfile} onOpenChange={onCloseProfile}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Профиль
              <Button variant="ghost" size="icon" onClick={onCloseProfile}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user?.avatar} alt={user?.firstName} />
                  <AvatarFallback className="telegram-blue text-white text-xl">
                    {getAvatarFallback(`${user?.firstName} ${user?.lastName || ""}`)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  className="absolute -bottom-1 -right-1 w-8 h-8 telegram-blue hover:telegram-light-blue rounded-full"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="text-lg font-bold">
                {user?.firstName} {user?.lastName || ""}
              </h3>
              <p className="text-sm text-gray-500">@{user?.username || "username"}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Имя</Label>
                <Input defaultValue={user?.firstName} />
              </div>
              
              <div>
                <Label>Фамилия</Label>
                <Input defaultValue={user?.lastName || ""} />
              </div>
              
              <div>
                <Label>Имя пользователя</Label>
                <Input defaultValue={user?.username || ""} />
              </div>
              
              <div>
                <Label>Номер телефона</Label>
                <div className="flex">
                  <Input defaultValue={user?.phone} className="flex-1" />
                  <Button variant="outline" className="ml-2">
                    Изменить
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Показывать номер</span>
                <Switch defaultChecked={user?.showPhone} />
              </div>
            </div>
            
            <Button className="w-full telegram-blue hover:telegram-light-blue">
              Сохранить изменения
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Group Modal */}
      <Dialog open={showCreateGroup} onOpenChange={onCloseCreateGroup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Новая группа
              <Button variant="ghost" size="icon" onClick={onCloseCreateGroup}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Название группы</Label>
              <Input
                placeholder="Введите название"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Описание (необязательно)</Label>
              <Textarea
                placeholder="Описание группы"
                rows={3}
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Имя пользователя (необязательно)</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 dark:bg-gray-600 border border-r-0 rounded-l-lg">
                  @
                </span>
                <Input
                  placeholder="username"
                  className="rounded-l-none"
                  value={groupUsername}
                  onChange={(e) => setGroupUsername(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleCreateGroup} 
            className="w-full telegram-blue hover:telegram-light-blue"
          >
            Создать группу
          </Button>
        </DialogContent>
      </Dialog>

      {/* Premium Modal */}
      <Dialog open={showPremium} onOpenChange={onClosePremium}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <span>Telegram Premium</span>
              </div>
              <Button variant="ghost" size="icon" onClick={onClosePremium}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <Upload className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span>Файлы до 4 ГБ</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span>Высокая скорость загрузки</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Heart className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span>Эксклюзивные стикеры</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <Palette className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <span>Дополнительные темы</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl text-center">
              <div className="text-2xl font-bold">БЕСПЛАТНО</div>
              <div className="text-sm opacity-90">
                В этой версии все функции Premium доступны бесплатно!
              </div>
            </div>
            
            <Button
              onClick={activatePremium}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              Активировать Premium
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Modal */}
      {showCall && callData && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="mb-8">
              <Avatar className="w-32 h-32 mx-auto mb-4">
                <AvatarImage src={callData.avatar} alt={callData.name} />
                <AvatarFallback className="telegram-blue text-white text-4xl">
                  {getAvatarFallback(callData.name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold mb-2">{callData.name}</h2>
              <p className="text-gray-300">
                {callData.type === "video" ? "Видеозвонок..." : "Звонок..."}
              </p>
            </div>
            
            <div className="flex justify-center space-x-8">
              <Button
                onClick={onCloseCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              
              <Button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-16 h-16 rounded-full ${
                  isMuted ? "bg-red-500 hover:bg-red-600" : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              
              {callData.type === "video" && (
                <Button
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={`w-16 h-16 rounded-full ${
                    isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
