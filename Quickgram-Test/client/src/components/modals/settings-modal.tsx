import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  UserCog, 
  Shield, 
  Bell, 
  Database, 
  Globe,
  ChevronRight,
  User as UserIcon,
  ArrowLeft,
  Plus,
  X
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
}

type SettingsView = "main" | "account" | "privacy" | "notifications" | "data" | "language" | "password";

export function SettingsModal({ open, onOpenChange, currentUser }: SettingsModalProps) {
  const [currentView, setCurrentView] = useState<SettingsView>("main");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: currentUser.firstName,
    lastName: currentUser.lastName || "",
    username: currentUser.username || "",
    bio: currentUser.bio || "",
    phone: currentUser.phone,
    additionalUsernames: currentUser.additionalUsernames || [],
    newUsername: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const { toast } = useToast();

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith("+888")) {
      return `Anonymous Number: ${phone}`;
    }
    return phone;
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const updates = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username || null,
        bio: formData.bio,
        additionalUsernames: formData.additionalUsernames.length > 0 ? formData.additionalUsernames : null,
      };

      await apiRequest("PUT", `/api/user/${currentUser.id}`, updates);
      
      // Update local storage
      const userData = JSON.parse(localStorage.getItem("telegramUser") || "{}");
      localStorage.setItem("telegramUser", JSON.stringify({ ...userData, ...updates }));
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      
      setCurrentView("main");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePassword = async () => {
    setIsLoading(true);
    try {
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error("Passwords don't match");
      }

      if (formData.newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      await apiRequest("PUT", `/api/user/${currentUser.id}/password`, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
      });
      
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      
      setCurrentView("main");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addAdditionalUsername = () => {
    if (formData.newUsername && !formData.additionalUsernames.includes(formData.newUsername)) {
      setFormData(prev => ({
        ...prev,
        additionalUsernames: [...prev.additionalUsernames, prev.newUsername],
        newUsername: "",
      }));
    }
  };

  const removeAdditionalUsername = (username: string) => {
    setFormData(prev => ({
      ...prev,
      additionalUsernames: prev.additionalUsernames.filter(u => u !== username),
    }));
  };

  const renderMainView = () => (
    <>
      {/* User Profile Section */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
          <Avatar className="w-16 h-16 bg-[var(--telegram-blue)]">
            <AvatarFallback className="bg-[var(--telegram-blue)]">
              <UserIcon className="w-8 h-8 text-white" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-semibold">{currentUser.firstName} {currentUser.lastName}</h4>
            <p className="text-sm text-muted-foreground">
              {formatPhoneNumber(currentUser.phone)}
            </p>
            {currentUser.username && (
              <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
            )}
            {currentUser.additionalUsernames && currentUser.additionalUsernames.length > 0 && (
              <p className="text-xs text-muted-foreground">
                also: {currentUser.additionalUsernames.map(u => `@${u}`).join(", ")}
              </p>
            )}
            {currentUser.isAnonymous && (
              <Badge variant="secondary" className="mt-1">
                Anonymous User
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Settings Options */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto"
          onClick={() => setCurrentView("account")}
        >
          <div className="flex items-center space-x-3">
            <UserCog className="w-5 h-5 text-muted-foreground" />
            <span>Account Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto"
          onClick={() => setCurrentView("password")}
        >
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <span>Password Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto"
          onClick={() => setCurrentView("privacy")}
        >
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <span>Privacy & Security</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto"
          onClick={() => setCurrentView("notifications")}
        >
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span>Notifications</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto"
          onClick={() => setCurrentView("data")}
        >
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-muted-foreground" />
            <span>Data & Storage</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto"
          onClick={() => setCurrentView("language")}
        >
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <span>Language</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </>
  );

  const renderAccountView = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          value={formData.firstName}
          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          value={formData.lastName}
          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
          className="mt-2"
          placeholder="Optional"
        />
      </div>

      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.replace("@", "") }))}
          className="mt-2"
          placeholder="@username"
        />
        <p className="text-xs text-muted-foreground mt-1">
          You can choose a username on Telegram. If you do, people will be able to find you by this username and contact you without needing your phone number.
        </p>
      </div>

      <div>
        <Label>Additional Usernames</Label>
        <div className="mt-2 space-y-2">
          {formData.additionalUsernames.map((username, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Input value={`@${username}`} disabled className="flex-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeAdditionalUsername(username)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center space-x-2">
            <Input
              value={formData.newUsername}
              onChange={(e) => setFormData(prev => ({ ...prev, newUsername: e.target.value.replace("@", "") }))}
              placeholder="@additional_username"
              className="flex-1"
            />
            <Button variant="ghost" size="icon" onClick={addAdditionalUsername}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
          className="mt-2"
          placeholder="Any details such as age, occupation or city"
          rows={3}
        />
      </div>

      <div>
        <Label>Phone Number</Label>
        <Input
          value={formatPhoneNumber(formData.phone)}
          disabled
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          You can change your phone number in Privacy & Security settings.
        </p>
      </div>

      <div className="flex space-x-2 pt-4">
        <Button
          variant="outline"
          onClick={() => setCurrentView("main")}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveProfile}
          disabled={isLoading}
          className="flex-1 bg-[var(--telegram-blue)] hover:bg-[var(--telegram-light-blue)]"
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );

  const renderPasswordView = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          type="password"
          value={formData.currentPassword}
          onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
          className="mt-2"
          placeholder="Leave empty if no password is set"
        />
      </div>

      <div>
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          value={formData.newPassword}
          onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
          className="mt-2"
          placeholder="Enter new password"
        />
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
          className="mt-2"
          placeholder="Confirm new password"
        />
      </div>

      <div className="flex space-x-2 pt-4">
        <Button
          variant="outline"
          onClick={() => setCurrentView("main")}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSavePassword}
          disabled={isLoading || !formData.newPassword || formData.newPassword !== formData.confirmPassword}
          className="flex-1 bg-[var(--telegram-blue)] hover:bg-[var(--telegram-light-blue)]"
        >
          {isLoading ? "Saving..." : "Save Password"}
        </Button>
      </div>
    </div>
  );

  const renderOtherViews = (title: string) => (
    <div className="text-center py-8">
      <p className="text-muted-foreground">
        {title} settings coming soon...
      </p>
      <Button
        variant="outline"
        onClick={() => setCurrentView("main")}
        className="mt-4"
      >
        Back to Settings
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            {currentView !== "main" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentView("main")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <DialogTitle>
              {currentView === "main" && "Settings"}
              {currentView === "account" && "Account Settings"}
              {currentView === "password" && "Password Settings"}
              {currentView === "privacy" && "Privacy & Security"}
              {currentView === "notifications" && "Notifications"}
              {currentView === "data" && "Data & Storage"}
              {currentView === "language" && "Language"}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        {currentView === "main" && renderMainView()}
        {currentView === "account" && renderAccountView()}
        {currentView === "password" && renderPasswordView()}
        {currentView === "privacy" && renderOtherViews("Privacy & Security")}
        {currentView === "notifications" && renderOtherViews("Notifications")}
        {currentView === "data" && renderOtherViews("Data & Storage")}
        {currentView === "language" && renderOtherViews("Language")}
      </DialogContent>
    </Dialog>
  );
}
