import { cn } from '../utils/cn';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
}

export default function Table<T extends Record<string, any>>({
  data,
  columns,
  className,
}: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="bg-capgemini-gray-100 border-b-2 border-capgemini-blue">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-4 py-3 text-left text-sm font-semibold text-capgemini-gray-700"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-capgemini-gray-500"
              >
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-capgemini-gray-200 hover:bg-capgemini-gray-50 transition-colors"
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={cn('px-4 py-3 text-sm text-capgemini-gray-700', col.className)}
                  >
                    {typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
