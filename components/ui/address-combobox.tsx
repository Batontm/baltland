"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface AddressComboboxProps {
  value: string
  onValueChange: (value: string) => void
  options: Array<{ id: string; name: string }>
  placeholder?: string
  emptyText?: string
  searchPlaceholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function AddressCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Выберите...",
  emptyText = "Ничего не найдено",
  searchPlaceholder = "Поиск...",
  disabled = false,
  loading = false,
  className,
}: AddressComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    
    const query = searchQuery.toLowerCase()
    return options.filter((option) =>
      option.name.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  // Find selected option
  const selectedOption = options.find((option) => option.name === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "w-full justify-between rounded-xl",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {loading ? "Загрузка..." : selectedOption ? selectedOption.name : placeholder}
          </span>
          <span className="ml-2 flex items-center gap-1 shrink-0">
            {!!value && !(disabled || loading) && (
              <span
                role="button"
                aria-label="Очистить"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onValueChange("")
                  setSearchQuery("")
                }}
              >
                <X className="h-4 w-4" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                    setSearchQuery("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
