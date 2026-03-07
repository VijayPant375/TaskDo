import { useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Plus, Bell, Sun, Moon, Trash2 } from 'lucide-react';
import { Button } from './components/ui/button';
import { TaskCard, Task } from './components/TaskCard';
import { AddEditTaskScreen } from './components/AddEditTaskScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { useTheme } from 'next-themes';

// localStorage key for tasks
const TASKS_STORAGE_KEY = 'tasks';

// Helper functions for localStorage
const loadTasksFromLocalStorage = (): Task[] => {
  try {
    const tasksJson = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!tasksJson) {
      return [];
    }
    const tasks = JSON.parse(tasksJson);
    // Convert date strings back to Date objects
    return tasks.map((task: any) => ({
      ...task,
      deadline: new Date(task.deadline),
      alarmTime: new Date(task.alarmTime),
    }));
  } catch (error) {
    console.error('Error loading tasks from localStorage:', error);
    return [];
  }
};

const saveTasksToLocalStorage = (tasks: Task[]) => {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
  }
};

function AppContent() {
  const { theme, setTheme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'add' | 'edit' | 'notifications'>('home');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [alarmingTask, setAlarmingTask] = useState<Task | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [alarmInterval, setAlarmInterval] = useState<number | null>(null);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const storedTasks = loadTasksFromLocalStorage();
    setTasks(storedTasks);
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (tasks.length > 0 || localStorage.getItem(TASKS_STORAGE_KEY)) {
      saveTasksToLocalStorage(tasks);
    }
  }, [tasks]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Check for alarms every minute
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      
      tasks.forEach((task) => {
        if (
          !task.completed &&
          task.notificationEnabled &&
          task.alarmTime
        ) {
          const alarmTime = new Date(task.alarmTime);
          const timeDiff = alarmTime.getTime() - now.getTime();
          
          // Trigger if alarm is within the last minute (to avoid missing it)
          if (timeDiff <= 60000 && timeDiff > 0) {
            triggerAlarm(task);
          }
        }
      });
    };

    // Check immediately
    checkAlarms();

    // Then check every 30 seconds
    const interval = setInterval(checkAlarms, 30000);

    return () => clearInterval(interval);
  }, [tasks]);

  const triggerAlarm = (task: Task) => {
    // Don't trigger if already alarming
    if (alarmingTask) return;

    // Set the alarming task to show modal
    setAlarmingTask(task);

    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Task Do - Reminder', {
        body: `${task.name}\n${task.description || 'No description'}`,
        icon: '/favicon.ico',
        tag: task.id,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // Start playing continuous alarm sound
    startAlarmSound();
  };

  const startAlarmSound = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(context);

      // Play the soothing alarm melody repeatedly
      const playMelody = () => {
        // Soothing melody notes (C major scale pleasant pattern)
        const notes = [523.25, 659.25, 783.99, 659.25]; // C5, E5, G5, E5
        const noteDuration = 0.4;
        const noteGap = 0.1;
        let time = context.currentTime;

        notes.forEach((frequency, index) => {
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(context.destination);

          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';

          // Envelope for smooth sound
          gainNode.gain.setValueAtTime(0, time);
          gainNode.gain.linearRampToValueAtTime(0.6, time + 0.05); // Loud and clear
          gainNode.gain.linearRampToValueAtTime(0.5, time + noteDuration - 0.1);
          gainNode.gain.linearRampToValueAtTime(0, time + noteDuration);

          oscillator.start(time);
          oscillator.stop(time + noteDuration);

          time += noteDuration + noteGap;
        });
      };

      // Play melody immediately
      playMelody();

      // Repeat every 2 seconds
      const interval = window.setInterval(() => {
        playMelody();
      }, 2000);

      setAlarmInterval(interval);
    } catch (error) {
      console.log('Audio alert not available');
    }
  };

  const stopAlarmSound = () => {
    if (alarmInterval) {
      clearInterval(alarmInterval);
      setAlarmInterval(null);
    }
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
  };

  const dismissAlarm = () => {
    stopAlarmSound();
    setAlarmingTask(null);
  };

  const snoozeAlarm = () => {
    stopAlarmSound();
    
    // Snooze for 5 minutes
    if (alarmingTask) {
      const newAlarmTime = new Date(Date.now() + 5 * 60 * 1000);
      setTasks((prev) =>
        prev.map((task) =>
          task.id === alarmingTask.id
            ? { ...task, alarmTime: newAlarmTime }
            : task
        )
      );
    }
    
    setAlarmingTask(null);
  };

  // Sort tasks: Primary by priority (high > medium > low), Secondary by deadline (earliest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    // Primary sort: by priority
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    // Secondary sort: by deadline (earliest first)
    return a.deadline.getTime() - b.deadline.getTime();
  });

  // Group tasks by priority for display
  const groupedTasks = {
    high: sortedTasks.filter((t) => t.priority === 'high' && !t.completed),
    medium: sortedTasks.filter((t) => t.priority === 'medium' && !t.completed),
    low: sortedTasks.filter((t) => t.priority === 'low' && !t.completed),
    completed: sortedTasks.filter((t) => t.completed),
  };

  const handleToggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleDelete = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setCurrentScreen('edit');
  };

  const handleSaveTask = (taskData: Omit<Task, 'id'>) => {
    if (editingTask) {
      // Update existing task
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id ? { ...taskData, id: task.id } : task
        )
      );
    } else {
      // Add new task
      const newTask: Task = {
        ...taskData,
        id: Date.now().toString(),
      };
      setTasks((prev) => [...prev, newTask]);
    }
    setCurrentScreen('home');
    setEditingTask(null);
  };

  const handleCancelEdit = () => {
    setCurrentScreen('home');
    setEditingTask(null);
  };

  const handleToggleNotification = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, notificationEnabled: !task.notificationEnabled }
          : task
      )
    );
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((task) => !task.completed));
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="min-h-screen bg-background">
      {currentScreen === 'home' && (
        <div className="max-w-md mx-auto px-4 py-6 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Task Do</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentScreen('notifications')}
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {activeTasks.filter((t) => t.notificationEnabled).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                    {activeTasks.filter((t) => t.notificationEnabled).length}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Task Statistics */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="text-2xl font-bold text-red-500">
                {groupedTasks.high.length}
              </div>
              <div className="text-xs text-muted-foreground">High Priority</div>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-500">
                {groupedTasks.medium.length}
              </div>
              <div className="text-xs text-muted-foreground">Medium Priority</div>
            </div>
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-500">
                {groupedTasks.low.length}
              </div>
              <div className="text-xs text-muted-foreground">Low Priority</div>
            </div>
          </div>

          {/* Task List */}
          {activeTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No tasks yet</h3>
              <p className="text-sm text-muted-foreground">
                Tap the + button to create your first task
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* High Priority Tasks */}
              {groupedTasks.high.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    High Priority
                  </h2>
                  <div className="space-y-3">
                    {groupedTasks.high.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={handleToggleComplete}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Medium Priority Tasks */}
              {groupedTasks.medium.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Medium Priority
                  </h2>
                  <div className="space-y-3">
                    {groupedTasks.medium.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={handleToggleComplete}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Low Priority Tasks */}
              {groupedTasks.low.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Low Priority
                  </h2>
                  <div className="space-y-3">
                    {groupedTasks.low.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={handleToggleComplete}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Completed
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCompleted}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {completedTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={handleToggleComplete}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Floating Add Button */}
          <Button
            size="lg"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
            onClick={() => setCurrentScreen('add')}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {(currentScreen === 'add' || currentScreen === 'edit') && (
        <AddEditTaskScreen
          task={editingTask}
          onSave={handleSaveTask}
          onCancel={handleCancelEdit}
        />
      )}

      {currentScreen === 'notifications' && (
        <NotificationsScreen
          tasks={tasks}
          onClose={() => setCurrentScreen('home')}
          onToggleNotification={handleToggleNotification}
        />
      )}

      {/* Alarm Modal */}
      {alarmingTask && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-pulse">
          <div className="bg-background rounded-3xl p-8 max-w-sm w-full shadow-2xl border-4 border-red-500 animate-in fade-in zoom-in duration-300">
            {/* Animated Bell Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
                <div className="relative bg-red-500 p-6 rounded-full">
                  <Bell className="w-12 h-12 text-white animate-bounce" />
                </div>
              </div>
            </div>

            {/* Task Info */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Task Reminder!</h2>
              <h3 className="text-xl font-semibold mb-3 text-red-500">
                {alarmingTask.name}
              </h3>
              {alarmingTask.description && (
                <p className="text-muted-foreground mb-4">
                  {alarmingTask.description}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Bell className="w-4 h-4" />
                <span>
                  {new Date(alarmingTask.alarmTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full h-12"
                onClick={dismissAlarm}
                size="lg"
              >
                Dismiss Alarm
              </Button>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={snoozeAlarm}
                size="lg"
              >
                Snooze (5 min)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AppContent />
    </ThemeProvider>
  );
}