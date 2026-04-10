import { Skeleton } from './ui/skeleton';

export function TaskListSkeleton() {
  return (
    <div className="space-y-6">
      {['High Priority', 'Medium Priority'].map((section) => (
        <div key={section}>
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={`${section}-${index}`}
                className="rounded-[1.35rem] border p-4 shadow-sm sm:p-5"
                style={{ background: 'color-mix(in srgb, var(--card) 90%, transparent)' }}
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="mt-1 h-5 w-5 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <Skeleton className="h-6 w-40 max-w-[70%]" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="mb-2 h-4 w-full" />
                    <Skeleton className="mb-4 h-4 w-4/5" />
                    <div className="mb-4 flex gap-2">
                      <Skeleton className="h-8 w-36 rounded-full" />
                      <Skeleton className="h-8 w-28 rounded-full" />
                    </div>
                    <div className="flex items-center justify-between border-t border-border/70 pt-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
