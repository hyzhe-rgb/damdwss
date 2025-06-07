import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Star, Phone, User, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    refetchInterval: 5000,
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("telegram_session")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Пользователь удален",
        description: "Аккаунт успешно удален из системы",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить пользователя",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = (users as any[]).filter((user: any) =>
    user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.includes(searchQuery)
  );

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Панель администратора
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Управление пользователями Telegram Clone
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Поиск пользователей</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Поиск по имени или номеру телефона..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Пользователи ({filteredUsers.length})</span>
                <Badge variant="outline">
                  Всего: {(users as any[]).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                        {user.firstName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </h3>
                          {user.isPremium && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{user.phone}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>ID: {user.id}</span>
                          </span>
                          {user.username && (
                            <span>@{user.username}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          Регистрация: {formatTime(user.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={user.isOnline ? "default" : "secondary"}
                        className={user.isOnline ? "bg-green-500" : ""}
                      >
                        {user.isOnline ? "Онлайн" : "Офлайн"}
                      </Badge>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteUserMutation.mutate(user.id)}
                        disabled={deleteUserMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Пользователи не найдены
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}