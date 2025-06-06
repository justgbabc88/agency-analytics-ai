
import React from 'react';
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Target, Settings, Home } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const mainNavItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: Home,
    },
    {
      path: '/tracking',
      label: 'Tracking',
      icon: Target,
    },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Agency Analytics</span>
          </div>
          
          {/* Main Navigation */}
          <div className="flex items-center gap-4">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
        
        {/* Integrations in top right */}
        <div className="flex items-center">
          <Button
            variant={location.pathname === '/integrations' ? "default" : "ghost"}
            onClick={() => navigate('/integrations')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Integrations
          </Button>
        </div>
      </div>
    </nav>
  );
};
