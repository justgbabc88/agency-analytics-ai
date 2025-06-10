
import React from 'react';
import { Button } from "@/components/ui/button";
import { Activity, Settings, User, LogOut } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/hooks/useAuth';
import { ProjectSelector } from '@/components/ProjectSelector';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { useProjects } from '@/hooks/useProjects';
import { AdvancedDateRangePicker } from '@/components/AdvancedDateRangePicker';

interface NavbarProps {
  onDateChange?: (from: Date, to: Date) => void;
}

export const Navbar = ({ onDateChange }: NavbarProps) => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { selectedProjectId, setSelectedProjectId } = useProjects();

  console.log('Navbar render - user:', user, 'loading:', loading);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const handleProjectCreated = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleDateChange = (from: Date, to: Date) => {
    if (onDateChange) {
      onDateChange(from, to);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">Agency Analytics</span>
        </div>
        
        {/* Right side - Project Selector, Date Filter, and Profile */}
        <div className="flex items-center gap-4">
          {/* Project Selector and Create Project */}
          <div className="flex items-center gap-2">
            <ProjectSelector 
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
              className="w-[200px]"
            />
            <CreateProjectModal onProjectCreated={handleProjectCreated} />
          </div>

          {/* Date Filter */}
          <div className="flex-shrink-0">
            <AdvancedDateRangePicker 
              onDateChange={handleDateChange}
              className="w-full sm:w-auto"
            />
          </div>

          {/* User Profile Dropdown */}
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                    <AvatarFallback>{getUserInitials(user.email || 'User')}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/integrations')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Integrations</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};
