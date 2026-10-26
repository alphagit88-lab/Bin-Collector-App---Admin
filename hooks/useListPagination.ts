'use client';

import { useEffect, useMemo, useState } from 'react';

export function useListPagination<T>(items: T[], getDate: (item: T) => string | null | undefined, pageSize = 10, serverTotalPages?: number) {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const filteredItems = useMemo(() => items.filter(item => {
    const raw = getDate(item);
    if (!raw) return !startDate && !endDate;
    const time = new Date(raw).getTime();
    if (Number.isNaN(time)) return false;
    if (startDate && time < new Date(`${startDate}T00:00:00`).getTime()) return false;
    if (endDate && time > new Date(`${endDate}T23:59:59.999`).getTime()) return false;
    return true;
  }), [items, getDate, startDate, endDate]);
  const totalPages = serverTotalPages ?? Math.max(1, Math.ceil(filteredItems.length / pageSize));
  useEffect(() => setPage(1), [startDate, endDate]);
  useEffect(() => setPage(value => Math.min(value, totalPages)), [totalPages]);
  const pagedItems = serverTotalPages === undefined ? filteredItems.slice((page - 1) * pageSize, page * pageSize) : filteredItems;
  return { pagedItems, filteredItems, page, setPage, totalPages, startDate, setStartDate, endDate, setEndDate };
}
