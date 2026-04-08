import { Calendar, Bell, BellOff, AlarmClock, Check, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';

export interface Task {
  id: string;
  name: string;
  description: string;
  deadline: Date;
  priority: 'high' | 'medium' | 'low';
  notificationEnabled: boolean;
  alarmTime: Date;
  completed: boolean;
}

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

const priorityColors = {
  high: 'bg-red-500 hover:bg-red-600',
  medium: 'bg-blue-500 hover:bg-blue-600',
  low: 'bg-green-500 hover:bg-green-600',
};

const priorityLabels = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function TaskCard({ task, onToggleComplete, onDelete, onEdit }: TaskCardProps) {
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  return (
    <div
      className={`group rounded-[1.35rem] border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5 ${
        task.completed ? 'opacity-60' : ''
      } cursor-pointer`}
      style={{
        background:
          'color-mix(in srgb, var(--card) 90%, transparent)',
      }}
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start gap-3">
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task.id);
          }}
        >
          <Checkbox checked={task.completed} className="mt-1" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3
              className={`pr-2 font-semibold leading-6 ${
                task.completed ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {task.name}
            </h3>
            <Badge className={`${priorityColors[task.priority]} text-white shrink-0`}>
              {priorityLabels[task.priority]}
            </Badge>
          </div>

          {task.description ? (
            <p className="mb-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {task.description}
            </p>
          ) : (
            <p className="mb-3 text-sm italic text-muted-foreground/80">No description added</p>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDateTime(task.deadline)}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1">
              <AlarmClock className="w-4 h-4" />
              <span>{formatTime(task.alarmTime)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/70 pt-3">
            <div className="flex items-center gap-1.5 text-xs">
              {task.notificationEnabled ? (
                <Bell className="w-4 h-4 text-blue-500" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {task.notificationEnabled ? 'Notifications On' : 'Notifications Off'}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="h-8 w-8 p-0 opacity-70 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
