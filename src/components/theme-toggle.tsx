"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const isDark = theme === "dark"

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center space-x-2">
        <Sun className="h-4 w-4" />
        <Label htmlFor="theme-switch" className="text-xs">Light</Label>
      </div>
       <Switch
        id="theme-switch"
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label="Toggle theme"
      />
      <div className="flex items-center space-x-2">
         <Moon className="h-4 w-4" />
         <Label htmlFor="theme-switch" className="text-xs">Dark</Label>
      </div>
      <span className="sr-only">Toggle theme</span>
    </div>
  )
}
