'use client';

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function ListPagination({ page, totalPages, onPageChange }: Props) {
  const pages = Math.max(1, totalPages);
  return (
    <div className="flex items-center justify-center gap-2 py-4" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
      <span className="min-w-24 text-center text-sm text-gray-600">Page {page} of {pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPageChange(page + 1)} className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">Next</button>
    </div>
  );
}
