import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon: React.ReactNode;
}

export function StatsCard({ title, value, description, trend, icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <CardDescription className="flex items-center gap-2 mt-1">
          {description}
          {trend && (
            <Badge variant={trend.direction === 'up' ? 'default' : 'secondary'} className="ml-auto">
              {trend.direction === 'up' ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(trend.value)}%
            </Badge>
          )}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
