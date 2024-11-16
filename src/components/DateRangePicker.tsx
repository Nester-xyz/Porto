import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { isValid } from "date-fns";

const DateRangePicker = ({ dateRange, setDateRange }: any) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  return (
    <div className="flex flex-col gap-4 mt-4">
      <DatePicker
        selected={startDate}
        onChange={(dates) => {
          const [start, end] = dates;
          if (start) {
            setStartDate(start);
          }
          setEndDate(end ?? undefined);

          if (end) {
            setDateRange((prev: any) => ({
              ...prev,
              max_date: end,
              min_date: start,
            }));
          }
        }}
        maxDate={new Date()}
        startDate={startDate}
        endDate={endDate}
        selectsRange
        customInput={
          <Input
            value={`asdasdfasdfasd:::${startDate.toLocaleDateString()}${isValid(endDate) && endDate ? ` - ${endDate.toLocaleDateString()}` : ""}`}
          />
        }
        fixedHeight
      />

      <Button
        variant="outline"
        onClick={() => {
          setDateRange({ min_date: undefined, max_date: undefined });
          setStartDate(new Date());
          setEndDate(undefined);
        }}
        className="w-full"
      >
        Clear Date Range
      </Button>
    </div>
  );
};

export default DateRangePicker;
