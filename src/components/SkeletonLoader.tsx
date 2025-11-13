import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CardSkeleton() {
  return (
    <Card className="premium-card animate-pulse">
      <CardHeader>
        <Skeleton className="h-6 w-3/4 bg-muted/40" />
        <Skeleton className="h-4 w-1/2 mt-3 bg-muted/30" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-24 w-full bg-muted/40 rounded-xl" />
        <Skeleton className="h-10 w-full bg-muted/30 rounded-lg" />
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-5 bg-muted/20 rounded-xl animate-pulse border border-border/20" style={{ animationDelay: `${i * 100}ms` }}>
          <Skeleton className="h-12 w-12 rounded-full bg-muted/40" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-muted/40" />
            <Skeleton className="h-3 w-1/2 bg-muted/30" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg bg-muted/30" />
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="premium-card animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-28 bg-muted/40" />
            <Skeleton className="h-10 w-10 rounded-lg bg-muted/30" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-20 bg-muted/50" />
            <Skeleton className="h-3 w-36 bg-muted/30" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="space-y-3">
        <Skeleton className="h-10 w-56 bg-muted/50" />
        <Skeleton className="h-5 w-[500px] bg-muted/30" />
      </div>
      <StatsSkeleton />
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="premium-card animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32 bg-muted/40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-24 bg-muted/50" />
              <Skeleton className="h-4 w-40 mt-2 bg-muted/30" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="premium-card animate-pulse" style={{ animationDelay: '400ms' }}>
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-muted/50" />
            <Skeleton className="h-4 w-32 mt-2 bg-muted/30" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full bg-muted/40 rounded-xl" />
          </CardContent>
        </Card>
        <Card className="premium-card animate-pulse" style={{ animationDelay: '500ms' }}>
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-muted/50" />
            <Skeleton className="h-4 w-32 mt-2 bg-muted/30" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full bg-muted/40 rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
