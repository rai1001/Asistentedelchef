"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { APP_NAME, sidebarNavItems, type NavItemConfig, type NavItemGroupConfig } from '@/config/site';
import { ChefHat, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
  // Initialize sidebar state from cookie or default to true (expanded)
  const [initialOpen, setInitialOpen] = React.useState(true);
  React.useEffect(() => {
    const storedState = document.cookie
      .split('; ')
      .find(row => row.startsWith('sidebar_state='))
      ?.split('=')[1];
    if (storedState) {
      setInitialOpen(storedState === 'true');
    }
  }, []);


  return (
    <SidebarProvider defaultOpen={initialOpen}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2 ">
            <ChefHat className="w-8 h-8 text-sidebar-primary" />
            <h1 className="text-xl font-headline font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {APP_NAME}
            </h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <NavMenu />
        </SidebarContent>
        <SidebarFooter className="p-4">
           <SidebarMenuButton
            tooltip={{children: "Cerrar Sesión", side: "right", align:"center"}}
            className="group-data-[collapsible=icon]:justify-center"
            onClick={() => alert("Cerrar sesión no implementado")}
          >
            <LogOut />
            <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
            <MobileSidebarTrigger />
            <div className="flex-1">
              {/* Breadcrumbs or global search could go here */}
            </div>
            {/* User menu or other actions */}
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function MobileSidebarTrigger() {
    const { isMobile } = useSidebar();
    if (!isMobile) return null;
    return <SidebarTrigger className="md:hidden" />;
}

function NavMenu() {
  const pathname = usePathname();
  const { state: sidebarState } = useSidebar();

  const isActive = (item: NavItemConfig) => {
    if (item.matchIncludes) {
      return pathname.startsWith(item.href);
    }
    return pathname === item.href;
  };

  return (
    <SidebarMenu>
      {sidebarNavItems.map((item, index) => {
        if ('groupTitle' in item) {
          const group = item as NavItemGroupConfig;
          return (
            <SidebarGroup key={group.groupTitle + index} className="px-2 pt-2 pb-1">
              {group.icon && (
                <SidebarGroupLabel className={cn("flex items-center gap-2", {"justify-center": sidebarState === 'collapsed'})}>
                  <group.icon className="h-5 w-5" />
                  <span className={cn({"hidden": sidebarState === 'collapsed'})}>{group.groupTitle}</span>
                </SidebarGroupLabel>
              )}
              {!group.icon && <SidebarGroupLabel>{group.groupTitle}</SidebarGroupLabel>}
              
              <SidebarMenu>
                {group.items.map((subItem) => (
                  <SidebarMenuItem key={subItem.href}>
                    <Link href={subItem.href} passHref legacyBehavior>
                      <SidebarMenuButton
                        isActive={isActive(subItem)}
                        disabled={subItem.disabled}
                        className="group-data-[collapsible=icon]:justify-center"
                        tooltip={{children: subItem.title, side: "right", align:"center"}}
                      >
                        <subItem.icon />
                        <span className="group-data-[collapsible=icon]:hidden">{subItem.title}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          );
        } else {
          const navItem = item as NavItemConfig;
          return (
            <SidebarMenuItem key={navItem.href} className="px-2">
              <Link href={navItem.href} passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={isActive(navItem)}
                  disabled={navItem.disabled}
                  className="group-data-[collapsible=icon]:justify-center"
                  tooltip={{children: navItem.title, side: "right", align:"center"}}
                >
                  <navItem.icon />
                  <span className="group-data-[collapsible=icon]:hidden">{navItem.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          );
        }
      })}
    </SidebarMenu>
  );
}
