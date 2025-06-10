
import React from 'react';
import { Button } from "@/components/ui/button";
import { Activity, Settings, User, LogOut, Plus, Bell } from "lucide-react";
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

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  // Add some debugging
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

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Logo and Create Report */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-green-500" />
            <span className="text-lg font-semibold text-white">Agency Analytics</span>
          </div>
          
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 h-8"
            onClick={() => navigate('/create-report')}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create report
          </Button>
        </div>
        
        {/* Center - Navigation Tabs */}
        <div className="flex items-center gap-8">
          <button className="text-gray-300 hover:text-white text-sm font-medium">
            Your Reports
          </button>
        </div>
        
        {/* Right side - Actions and Profile */}
        <div className="flex items-center gap-4">
          {/* Tracking Percentage */}
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded">
            <span className="text-sm text-gray-300">Tracking percentage</span>
            <span className="text-sm font-semibold text-green-500">91%</span>
          </div>
          
          {/* Settings */}
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2">
            <Settings className="h-4 w-4" />
          </Button>
          
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              2
            </span>
          </Button>

          {/* User Profile Dropdown */}
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                    <AvatarFallback className="bg-blue-600 text-white text-xs">
                      {getUserInitials(user.email || 'User')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">
                      {user.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem 
                  onClick={() => navigate('/settings')}
                  className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};
