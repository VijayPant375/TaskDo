import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Task } from './TaskCard';

interface AddEditTaskScreenProps {
  task?: Task | null;
  onSave: (task: Omit<Task, 'id'>) => void;
  onCancel: () => void;
}

export function AddEditTaskScreen({ task, onSave, onCancel }: AddEditTaskScreenProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [alarmTime, setAlarmTime] = useState('');

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description);
      setDeadline(formatDateTimeLocal(task.deadline));
      setPriority(task.priority);
      setNotificationEnabled(task.notificationEnabled);
      setAlarmTime(formatDateTimeLocal(task.alarmTime));
    } else {
      // Set defaults for new task
      const now = new Date();
      const defaultDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const defaultAlarm = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      
      setDeadline(formatDateTimeLocal(defaultDeadline));
      setAlarmTime(formatDateTimeLocal(defaultAlarm));
    }
  }, [task]);

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !deadline || !alarmTime) {
      alert('Please fill in all required fields');
      return;
    }

    onSave({
      name,
      description,
      deadline: new Date(deadline),
      priority,
      notificationEnabled,
      alarmTime: new Date(alarmTime),
      completed: task?.completed || false,
    });
  };

  const priorityOptions = [
    { value: 'high', label: 'High', color: 'bg-red-500' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
    { value: 'low', label: 'Low', color: 'bg-green-500' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-5 sm:py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{task ? 'Edit Task' : 'Add New Task'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Capture the essentials now and refine details later.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="surface-panel space-y-6 rounded-[1.75rem] border p-4 shadow-sm sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Task Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter task name"
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Task Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add helpful details or leave it blank"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline *</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alarm">Alarm / Reminder Time *</Label>
              <Input
                id="alarm"
                type="datetime-local"
                value={alarmTime}
                onChange={(e) => setAlarmTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="grid grid-cols-3 gap-2.5">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`rounded-xl px-4 py-3 font-medium text-white transition-all ${
                    option.color
                  } ${
                    priority === option.value
                      ? 'scale-[1.03] ring-2 ring-ring ring-offset-2 ring-offset-background'
                      : 'opacity-60 hover:opacity-80'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border bg-card/70 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="notification">Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive reminders for this task
              </p>
            </div>
            <Switch
              id="notification"
              checked={notificationEnabled}
              onCheckedChange={setNotificationEnabled}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {task ? 'Update Task' : 'Save Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
