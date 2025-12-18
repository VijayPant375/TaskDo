import { X, Bell, BellOff, AlarmClock, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Task } from './TaskCard';
import { Badge } from './ui/badge';

interface NotificationsScreenProps {
  tasks: Task[];
  onClose: () => void;
  onToggleNotification: (id: string) => void;
}

const priorityColors = {
  high: 'bg-red-500',
  medium: 'bg-blue-500',
  low: 'bg-green-500',
};

const priorityLabels = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function NotificationsScreen({
  tasks,
  onClose,
  onToggleNotification,
}: NotificationsScreenProps) {
  // Filter active tasks (not completed) and sort by alarm time
  const upcomingTasks = tasks
    .filter((task) => !task.completed)
    .sort((a, b) => a.alarmTime.getTime() - b.alarmTime.getTime());

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

  const isUpcoming = (alarmTime: Date) => {
    return alarmTime.getTime() > Date.now();
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Notifications & Reminders</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Upcoming Reminders</h3>
              <p className="text-sm text-muted-foreground">
                {upcomingTasks.filter((t) => t.notificationEnabled && isUpcoming(t.alarmTime)).length} active alarm{upcomingTasks.filter((t) => t.notificationEnabled && isUpcoming(t.alarmTime)).length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {upcomingTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex p-4 rounded-full bg-muted mb-4">
              <BellOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Active Tasks</h3>
            <p className="text-sm text-muted-foreground">
              Add tasks to see their reminders here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl border bg-card shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{task.name}</h3>
                    <Badge className={`${priorityColors[task.priority]} text-white`}>
                      {priorityLabels[task.priority]}
                    </Badge>
                  </div>
                  <Switch
                    checked={task.notificationEnabled}
                    onCheckedChange={() => onToggleNotification(task.id)}
                  />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlarmClock className="w-4 h-4" />
                    <span>
                      Alarm: <span className="font-medium text-foreground">{formatDateTime(task.alarmTime)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Deadline: <span className="font-medium text-foreground">{formatDateTime(task.deadline)}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    {task.notificationEnabled ? (
                      <>
                        <Bell className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-blue-500 font-medium">
                          {isUpcoming(task.alarmTime) ? 'Alarm Active' : 'Alarm Passed'}
                        </span>
                      </>
                    ) : (
                      <>
                        <BellOff className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Notifications Disabled
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
