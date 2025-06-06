"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TDateRange } from "@/types/render";

function formatDate(date: Date | undefined) {
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false;
  }
  return !isNaN(date.getTime());
}

function SingleDatePicker({
  label,
  date: initialDate,
  onDateChange,
}: {
  label: string;
  date: Date;
  onDateChange: (date: Date) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(initialDate);
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const [value, setValue] = React.useState(formatDate(date));

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={label.toLowerCase()} className="px-1">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={label.toLowerCase()}
          value={value}
          placeholder="June 01, 2025"
          className="bg-background pr-10"
          onChange={(e) => {
            const date = new Date(e.target.value);
            setValue(e.target.value);
            if (isValidDate(date)) {
              setDate(date);
              setMonth(date);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date-picker"
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={(date) => {
                if (!date) return;
                setDate(date);
                setValue(formatDate(date));
                onDateChange(date);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function Calendar28({
  onDateChange,
  initialDate,
}: {
  onDateChange: (range: TDateRange) => void;
  initialDate: TDateRange;
}) {
  const handleStartDateChange = (date: Date) => {
    onDateChange({ ...initialDate, min_date: date });
  };

  const handleEndDateChange = (date: Date) => {
    onDateChange({ ...initialDate, max_date: date });
  };

  return (
    <div className="flex gap-4">
      <SingleDatePicker
        label="Start Date"
        date={initialDate.min_date!}
        onDateChange={handleStartDateChange}
      />
      <SingleDatePicker
        label="End Date"
        date={initialDate.max_date!}
        onDateChange={handleEndDateChange}
      />
    </div>
  );
}
