import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";

const DateRangePicker = ({ dateRange, setDateRange }: any) => {
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");

  const handleDateInput = (value: string, isStartDate: boolean) => {
    try {
      const dateStr = value.trim();
      if (dateStr === "") {
        if (isStartDate) {
          setStartDateInput("");
          setDateRange((prev: any) => ({ ...prev, min_date: undefined }));
        } else {
          setEndDateInput("");
          setDateRange((prev: any) => ({ ...prev, max_date: undefined }));
        }
        return;
      }

      const parsedDate = parse(dateStr, "MM/dd/yyyy", new Date());

      if (isValid(parsedDate)) {
        if (isStartDate) {
          setStartDateInput(dateStr);
          setDateRange((prev: any) => ({ ...prev, min_date: parsedDate }));
        } else {
          setEndDateInput(dateStr);
          setDateRange((prev: any) => ({ ...prev, max_date: parsedDate }));
        }
      }
    } catch (error) {
      // Invalid date format - do nothing
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="MM/DD/YYYY"
              value={
                startDateInput ||
                (dateRange.min_date
                  ? format(dateRange.min_date, "MM/dd/yyyy")
                  : "")
              }
              onChange={(e) => handleDateInput(e.target.value, true)}
              className="flex-1"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange.min_date}
                  onSelect={(date) => {
                    setDateRange((prev: any) => ({
                      ...prev,
                      min_date: date,
                    }));
                    if (date) {
                      setStartDateInput(format(date, "MM/dd/yyyy"));
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="MM/DD/YYYY"
              value={
                endDateInput ||
                (dateRange.max_date
                  ? format(dateRange.max_date, "MM/dd/yyyy")
                  : "")
              }
              onChange={(e) => handleDateInput(e.target.value, false)}
              className="flex-1"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange.max_date}
                  onSelect={(date) => {
                    setDateRange((prev: any) => ({
                      ...prev,
                      max_date: date,
                    }));
                    if (date) {
                      setEndDateInput(format(date, "MM/dd/yyyy"));
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={() => {
          setDateRange({ min_date: undefined, max_date: undefined });
          setStartDateInput("");
          setEndDateInput("");
        }}
        className="w-full"
      >
        Clear Date Range
      </Button>
    </div>
  );
};

export default DateRangePicker;
