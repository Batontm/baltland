"use client"

import { useState, useEffect } from "react"
import { AdminSidebar, type AdminSection } from "./admin-sidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminLayoutProps {
    children: React.ReactNode
    activeSection: AdminSection
    onSectionChange: (section: AdminSection) => void
    onLogout: () => void
    newLeadsCount?: number
}

export function AdminLayout({
    children,
    activeSection,
    onSectionChange,
    onLogout,
    newLeadsCount = 0,
}: AdminLayoutProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
        }
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    const handleSectionChange = (section: AdminSection) => {
        onSectionChange(section)
        setMobileMenuOpen(false)
    }

    return (
        <div className="min-h-screen flex bg-background">
            {/* Desktop Sidebar - Fixed */}
            {!isMobile && (
                <div className="sticky top-0 h-screen">
                    <AdminSidebar
                        activeSection={activeSection}
                        onSectionChange={onSectionChange}
                        onLogout={onLogout}
                        newLeadsCount={newLeadsCount}
                    />
                </div>
            )}

            {/* Mobile Header + Drawer */}
            {isMobile && (
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="fixed top-4 left-4 z-50 lg:hidden bg-slate-900 text-white hover:bg-slate-800"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-64 bg-slate-900 border-slate-700">
                        <SheetTitle className="sr-only">Меню администратора</SheetTitle>
                        <SheetDescription className="sr-only">Навигация по админ-панели</SheetDescription>
                        <AdminSidebar
                            activeSection={activeSection}
                            onSectionChange={handleSectionChange}
                            onLogout={onLogout}
                            newLeadsCount={newLeadsCount}
                        />
                    </SheetContent>
                </Sheet>
            )}

            {/* Main Content - Scrollable */}
            <main
                className={cn(
                    "flex-1 min-h-screen overflow-auto",
                    isMobile && "pt-16"
                )}
            >
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    <TooltipProvider>
                        {children}
                    </TooltipProvider>
                </div>
            </main>
        </div>
    )
}
