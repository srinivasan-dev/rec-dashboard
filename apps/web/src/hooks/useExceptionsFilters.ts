import { useSearchParams } from 'react-router-dom';

import type { ExceptionReason, ExceptionsFilters, SortBy, SortOrder } from '../api/types';
import { EXCEPTION_LABELS } from '../dashboard/exceptionLabels';

const DEFAULTS: ExceptionsFilters = {
  page: 1,
  pageSize: 10,
  sortBy: 'transactionDate',
  sortOrder: 'asc',
};

/** Options offered by the table's page-size selector (ExceptionsTable.tsx) -- kept here, next to
 *  the default, so the two can't drift apart. All well within the API's `max(100)` bound
 *  (apps/api/src/validation/exceptionsQuery.ts). */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const SORT_BY_VALUES: SortBy[] = ['transactionDate', 'transactionId', 'reason', 'differenceAmount'];
const SORT_ORDER_VALUES: SortOrder[] = ['asc', 'desc'];
const REASON_VALUES = Object.keys(EXCEPTION_LABELS) as ExceptionReason[];

function readFilters(searchParams: URLSearchParams): ExceptionsFilters {
  const page = Number(searchParams.get('page'));
  const pageSize = Number(searchParams.get('pageSize'));
  const reason = searchParams.get('reason');
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULTS.pageSize,
    reason: REASON_VALUES.includes(reason as ExceptionReason)
      ? (reason as ExceptionReason)
      : undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    transactionId: searchParams.get('transactionId') || undefined,
    sortBy: SORT_BY_VALUES.includes(sortBy as SortBy) ? (sortBy as SortBy) : DEFAULTS.sortBy,
    sortOrder: SORT_ORDER_VALUES.includes(sortOrder as SortOrder)
      ? (sortOrder as SortOrder)
      : DEFAULTS.sortOrder,
    showMatched: searchParams.get('showMatched') === 'true',
  };
}

/**
 * Filters/sort/page live in the URL, not component state or Redux -- see
 * docs/product-spec.md §7 and success criterion 4 (shareable, survives refresh) and
 * docs/standards/frontend-standards.md's state-boundary table. Default values are omitted from
 * the URL entirely, so a merchant's link stays clean until they actually change something.
 */
export function useExceptionsFilters(): [
  ExceptionsFilters,
  (patch: Partial<ExceptionsFilters>) => void,
] {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);

  function updateFilters(patch: Partial<ExceptionsFilters>): void {
    const next: ExceptionsFilters = { ...filters, ...patch };
    // Changing a filter/sort (anything but the page itself) resets to page 1 -- otherwise a
    // merchant could land on a page number that no longer exists under the new filter.
    if (!('page' in patch)) next.page = 1;

    const params = new URLSearchParams();
    if (next.page !== DEFAULTS.page) params.set('page', String(next.page));
    if (next.pageSize !== DEFAULTS.pageSize) params.set('pageSize', String(next.pageSize));
    if (next.reason) params.set('reason', next.reason);
    if (next.from) params.set('from', next.from);
    if (next.to) params.set('to', next.to);
    if (next.transactionId) params.set('transactionId', next.transactionId);
    if (next.sortBy !== DEFAULTS.sortBy) params.set('sortBy', next.sortBy);
    if (next.sortOrder !== DEFAULTS.sortOrder) params.set('sortOrder', next.sortOrder);
    if (next.showMatched) params.set('showMatched', 'true');
    setSearchParams(params);
  }

  return [filters, updateFilters];
}
