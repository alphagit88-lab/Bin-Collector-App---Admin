'use client';

type Props = {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

export default function DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="text-sm text-gray-600">Start Date
        <input type="date" value={startDate} max={endDate || undefined} onChange={e => onStartDateChange(e.target.value)} className="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2" />
      </label>
      <label className="text-sm text-gray-600">End Date
        <input type="date" value={endDate} min={startDate || undefined} onChange={e => onEndDateChange(e.target.value)} className="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2" />
      </label>
      {(startDate || endDate) && <button type="button" onClick={() => { onStartDateChange(''); onEndDateChange(''); }} className="rounded-md border px-3 py-2 text-sm">Clear</button>}
    </div>
  );
}
