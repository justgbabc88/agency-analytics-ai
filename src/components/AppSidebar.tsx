
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
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path === '/' && location.pathname === '/') ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      onClick={() => navigate(item.url)}
                    >
                      <button className="flex items-center gap-2 w-full">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
