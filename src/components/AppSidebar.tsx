
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Facebook, TrendingUp, MessageSquare, AlertTriangle, Settings } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const sidebarItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: BarChart3,
  },
  {
    title: "Facebook Ads",
    url: "/facebook-ads",
    icon: Facebook,
  },
  {
    title: "Predictions",
    url: "/predictions",
    icon: TrendingUp,
  },
  {
    title: "AI Assistant",
    url: "/ai-assistant",
    icon: MessageSquare,
  },
  {
    title: "Alerts",
    url: "/alerts",
    icon: AlertTriangle,
  },
  {
    title: "Integrations",
    url: "/integrations",
    icon: Settings,
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar className="border-r border-gray-800" style={{ width: '64px', minWidth: '64px', maxWidth: '64px' }} collapsible="none">
      <SidebarContent className="bg-gray-900">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 pt-4">
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url === '/' && location.pathname === '/') ||
                  (item.url !== '/' && location.pathname.startsWith(item.url));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      onClick={() => navigate(item.url)}
                      className="group relative"
                      tooltip={item.title}
                    >
                      <button className={`
                        flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 mx-auto
                        ${isActive 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }
                      `}>
                        <item.icon className="h-5 w-5" />
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
