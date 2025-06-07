import { useState } from "react";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import Modals from "./Modals";
import { useTelegram } from "@/hooks/useTelegram";

export default function MainApp() {
  const [currentChat, setCurrentChat] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [callData, setCallData] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { user } = useTelegram();

  const openChat = (chat: any) => {
    setCurrentChat(chat);
  };

  const startCall = (type: "voice" | "video") => {
    if (!currentChat) return;
    
    setCallData({
      name: currentChat.name,
      avatar: currentChat.avatar,
      type,
    });
    setShowCall(true);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900 transition-colors duration-200">
      <Sidebar
        onOpenChat={openChat}
        currentChat={currentChat}
        onShowMenu={() => setShowMenu(true)}
        onShowSettings={() => setShowSettings(true)}
      />
      
      <ChatArea
        currentChat={currentChat}
        onStartCall={startCall}
      />

      <Modals
        showMenu={showMenu}
        onCloseMenu={() => setShowMenu(false)}
        showSettings={showSettings}
        onCloseSettings={() => setShowSettings(false)}
        showProfile={showProfile}
        onCloseProfile={() => setShowProfile(false)}
        showCreateGroup={showCreateGroup}
        onCloseCreateGroup={() => setShowCreateGroup(false)}
        showPremium={showPremium}
        onClosePremium={() => setShowPremium(false)}
        showCall={showCall}
        onCloseCall={() => setShowCall(false)}
        callData={callData}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onShowProfile={() => {
          setShowMenu(false);
          setShowProfile(true);
        }}
        onShowCreateGroup={() => {
          setShowMenu(false);
          setShowCreateGroup(true);
        }}
        onShowPremium={() => {
          setShowSettings(false);
          setShowPremium(true);
        }}
        user={user}
      />
    </div>
  );
}
