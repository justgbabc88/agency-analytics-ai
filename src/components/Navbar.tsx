
import React from 'react';
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Settings, Target } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: BarChart3,
    },
    {
      path: '/tracking',
      label: 'Tracking',
      icon: Target,
    },
    {
      path: '/integrations',
      label: 'Integrations',
      icon: Settings,
    },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">Agency Analytics</span>
        </div>
        
        <div className="flex items-center gap-4">
          {navItems.map((item) => {
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
    </nav>
  );
};
