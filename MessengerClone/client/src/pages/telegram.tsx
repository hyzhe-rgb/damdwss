import { useState, useEffect } from "react";
import LoginScreen from "@/components/telegram/LoginScreen";
import MainApp from "@/components/telegram/MainApp";
import { useTelegram } from "@/hooks/useTelegram";

export default function TelegramPage() {
  const { user, isAuthenticated } = useTelegram();
  
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainApp />;
}
