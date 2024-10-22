import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const DateRangePicker = ({ dateRange, setDateRange }:any) => {
  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.min_date ? (
                  format(dateRange.min_date, 'PPP')
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateRange.min_date}
                onSelect={(date) =>
                  setDateRange((prev:any) => ({
                    ...prev,
                    min_date: date
                  }))
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.max_date ? (
                  format(dateRange.max_date, 'PPP')
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateRange.max_date}
                onSelect={(date) =>
                  setDateRange((prev:any) => ({
                    ...prev,
                    max_date: date
                  }))
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <Button
        variant="outline"
        onClick={() => setDateRange({ min_date: undefined, max_date: undefined })}
        className="w-full"
      >
        Clear Date Range
      </Button>
    </div>
  );
};

export default DateRangePicker;