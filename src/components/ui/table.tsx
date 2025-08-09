import * as React from 'react';
import { cn } from '../../lib/cn';

export const Table = (
  props: React.HTMLAttributes<HTMLTableElement> & { className?: string }
) => <table {...props} className={cn('w-full border-collapse', props.className)} />;
export const THead = (
  props: React.HTMLAttributes<HTMLTableSectionElement> & { className?: string }
) => <thead {...props} className={cn('bg-gray-100 sticky top-0', props.className)} />;
export const TBody = (
  props: React.HTMLAttributes<HTMLTableSectionElement> & { className?: string }
) => <tbody {...props} className={cn('', props.className)} />;
export const TR = (
  props: React.HTMLAttributes<HTMLTableRowElement> & { className?: string }
) => <tr {...props} className={cn('', props.className)} />;
export const TH = (
  props: React.ThHTMLAttributes<HTMLTableCellElement> & { className?: string }
) => <th {...props} className={cn('border px-3 py-2 text-left', props.className)} />;
export const TD = (
  props: React.TdHTMLAttributes<HTMLTableCellElement> & { className?: string }
) => <td {...props} className={cn('border px-3 py-2', props.className)} />;
