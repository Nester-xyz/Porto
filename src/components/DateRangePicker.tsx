import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TDateRange } from "@/types/render";
import { isValid } from "date-fns";
import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const DateRangePicker = ({
  dateRange,
  setDateRange,
}: {
  dateRange: TDateRange;
  setDateRange: React.Dispatch<React.SetStateAction<TDateRange>>;
}) => {
  const [startDate, setStartDate] = useState(dateRange.min_date ?? new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(dateRange.max_date);

  useEffect(() => {
    if (startDate && endDate) {
      setDateRange({
        min_date: startDate,
        max_date: endDate,
      });
    }
  }, [startDate, endDate, setDateRange]);

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="flex gap-2 items-center">
        <div className="text-lg">Date Range: </div>
        <DatePicker
          selected={startDate}
          onChange={(dates: [Date | null, Date | null]) => {
            const [start, end] = dates;

            if (start) setStartDate(start);
            setEndDate(end ?? undefined);
          }}
          maxDate={new Date()}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          customInput={
            <Input
              value={`${startDate.toLocaleDateString()}${isValid(endDate) && endDate ? ` - ${endDate.toLocaleDateString()}` : ""}`}
            />
          }
          fixedHeight
        />
      </div>
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
