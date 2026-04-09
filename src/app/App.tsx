import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Bell, Crown, LogOut, Moon, Plus, Settings, Sparkles, Sun, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SubscriptionProvider, useSubscription } from '../context/SubscriptionContext';
import { createTask, deleteTask, fetchTasks, updateTask } from '../services/tasks';
import { FREE_TASK_LIMIT } from '../types/subscription';
import type { Task } from '../types/task';
import { AddEditTaskScreen } from './components/AddEditTaskScreen';
import { AuthLandingScreen } from './components/AuthLandingScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { PremiumBadge } from './components/PremiumBadge';
import { SettingsScreen } from './components/SettingsScreen';
import { SuccessScreen } from './components/SuccessScreen';
import { TaskCard } from './components/TaskCard';
import { UpgradeModal } from './components/UpgradeModal';
import { Button } from './components/ui/button';

function AppContent() {
  const { theme, setTheme } = useTheme();
  const { canCreateTask, isPremium } = useSubscription();
  const {
    googleOAuthEnabled,
    isAuthenticated,
    isLoading: isAuthLoading,
    signInWithGoogle,
    signOut,
    user,
  } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentScreen, setCurrentScreen] = useState<
    'home' | 'add' | 'edit' | 'notifications' | 'settings' | 'success'
  >('home');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalTrigger, setUpgradeModalTrigger] = useState<'manual' | 'task_limit' | 'feature_locked'>('manual');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [alarmingTask, setAlarmingTask] = useState<Task | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [alarmInterval, setAlarmInterval] = useState<number | null>(null);
  const [isTasksLoading, setIsTasksLoading] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const checkoutState = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');

    if (checkoutState === 'success' && sessionId) {
      setCheckoutSessionId(sessionId);
      setCurrentScreen('success');
      return;
    }

    if (checkoutState === 'canceled') {
      setUpgradeModalTrigger('manual');
      setShowUpgradeModal(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setTasks([]);
      return;
    }

    const loadAuthenticatedTasks = async () => {
      setIsTasksLoading(true);

      try {
        const remoteTasks = await fetchTasks();
        setTasks(remoteTasks);
      } catch (error) {
        console.error('Failed to sync tasks for the authenticated user.', error);
      } finally {
        setIsTasksLoading(false);
      }
    };

    void loadAuthenticatedTasks();
  }, [isAuthenticated, isAuthLoading]);

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

  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();

      tasks.forEach((task) => {
        if (!task.completed && task.notificationEnabled && task.alarmTime) {
          const alarmTime = new Date(task.alarmTime);
          const timeDiff = alarmTime.getTime() - now.getTime();

          if (timeDiff <= 60000 && timeDiff > 0) {
            triggerAlarm(task);
          }
        }
      });
    };

    checkAlarms();
    const interval = setInterval(checkAlarms, 30000);
    return () => clearInterval(interval);
  }, [tasks, alarmingTask, notificationPermission]);

  const triggerAlarm = (task: Task) => {
    if (alarmingTask) {
      return;
    }

    setAlarmingTask(task);

    if ('Notification' in window && notificationPermission === 'granted') {
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

    startAlarmSound();
  };

  const startAlarmSound = () => {
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtor) {
        return;
      }

      const context = new AudioCtor();
      setAudioContext(context);

      const playMelody = () => {
        const notes = [523.25, 659.25, 783.99, 659.25];
        const noteDuration = 0.4;
        const noteGap = 0.1;
        let time = context.currentTime;

        notes.forEach((frequency) => {
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(context.destination);

          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0, time);
          gainNode.gain.linearRampToValueAtTime(0.6, time + 0.05);
          gainNode.gain.linearRampToValueAtTime(0.5, time + noteDuration - 0.1);
          gainNode.gain.linearRampToValueAtTime(0, time + noteDuration);

          oscillator.start(time);
          oscillator.stop(time + noteDuration);

          time += noteDuration + noteGap;
        });
      };

      playMelody();

      const interval = window.setInterval(() => {
        playMelody();
      }, 2000);

      setAlarmInterval(interval);
    } catch (error) {
      console.log('Audio alert not available', error);
    }
  };

  const stopAlarmSound = () => {
    if (alarmInterval) {
      clearInterval(alarmInterval);
      setAlarmInterval(null);
    }

    if (audioContext) {
      void audioContext.close();
      setAudioContext(null);
    }
  };

  const persistTaskUpdate = async (nextTask: Task) => {
    try {
      const updated = await updateTask(nextTask);
      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
    } catch (error) {
      console.error('Failed to update task.', error);
    }
  };

  const dismissAlarm = () => {
    stopAlarmSound();
    setAlarmingTask(null);
  };

  const snoozeAlarm = () => {
    stopAlarmSound();

    if (alarmingTask) {
      const newAlarmTime = new Date(Date.now() + 5 * 60 * 1000);
      void persistTaskUpdate({ ...alarmingTask, alarmTime: newAlarmTime });
    }

    setAlarmingTask(null);
  };

  const sortedTasks = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    return [...tasks].sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      return a.deadline.getTime() - b.deadline.getTime();
    });
  }, [tasks]);

  const groupedTasks = useMemo(
    () => ({
      high: sortedTasks.filter((task) => task.priority === 'high' && !task.completed),
      medium: sortedTasks.filter((task) => task.priority === 'medium' && !task.completed),
      low: sortedTasks.filter((task) => task.priority === 'low' && !task.completed),
      completed: sortedTasks.filter((task) => task.completed),
    }),
    [sortedTasks]
  );

  const handleToggleComplete = (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) {
      return;
    }

    void persistTaskUpdate({ ...target, completed: !target.completed });
  };

  const handleDelete = (id: string) => {
    void (async () => {
      try {
        await deleteTask(id);
        setTasks((prev) => prev.filter((task) => task.id !== id));
      } catch (error) {
        console.error('Failed to delete task.', error);
      }
    })();
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setCurrentScreen('edit');
  };

  const handleAddTask = () => {
    const activeTaskCount = tasks.filter((task) => !task.completed).length;

    if (!canCreateTask(activeTaskCount)) {
      setUpgradeModalTrigger('task_limit');
      setShowUpgradeModal(true);
      return;
    }

    setCurrentScreen('add');
  };

  const handleSaveTask = (taskData: Omit<Task, 'id'>) => {
    void (async () => {
      try {
        if (editingTask) {
          const updatedTask = await updateTask({ ...taskData, id: editingTask.id });
          setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
        } else {
          const createdTask = await createTask(taskData);
          setTasks((prev) => [...prev, createdTask]);
        }

        setCurrentScreen('home');
        setEditingTask(null);
      } catch (error) {
        console.error('Failed to save task.', error);
      }
    })();
  };

  const handleCancelEdit = () => {
    setCurrentScreen('home');
    setEditingTask(null);
  };

  const handleToggleNotification = (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) {
      return;
    }

    void persistTaskUpdate({
      ...target,
      notificationEnabled: !target.notificationEnabled,
    });
  };

  const handleClearCompleted = () => {
    void (async () => {
      try {
        const completedTaskIds = tasks.filter((task) => task.completed).map((task) => task.id);
        await Promise.all(completedTaskIds.map((taskId) => deleteTask(taskId)));
        setTasks((prev) => prev.filter((task) => !task.completed));
      } catch (error) {
        console.error('Failed to clear completed tasks.', error);
      }
    })();
  };

  const handleSuccessContinue = () => {
    setCheckoutSessionId(null);
    setCurrentScreen('home');
    window.history.replaceState({}, '', window.location.pathname);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const taskLimitReached = !isPremium && activeTasks.length >= FREE_TASK_LIMIT;
  const prioritySummary = [
    { label: 'High priority', value: groupedTasks.high.length, tone: 'text-red-500' },
    { label: 'Medium priority', value: groupedTasks.medium.length, tone: 'text-blue-500' },
    { label: 'Low priority', value: groupedTasks.low.length, tone: 'text-green-500' },
  ];
  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'T';

  if (currentScreen === 'success' && checkoutSessionId) {
    return <SuccessScreen onContinue={handleSuccessContinue} sessionId={checkoutSessionId} />;
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface-panel w-full max-w-md rounded-[2rem] border px-8 py-10 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold">Preparing TaskDo</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Restoring your account session and workspace.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthLandingScreen
        googleOAuthEnabled={googleOAuthEnabled}
        isLoading={isAuthLoading}
        onContinueWithGoogle={signInWithGoogle}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background app-shell">
      {currentScreen === 'home' && (
        <div className="mx-auto max-w-7xl px-4 py-5 pb-24 sm:py-6 lg:px-6">
          <header className="surface-panel mb-6 rounded-[2rem] border border-white/40 px-5 py-5 shadow-sm sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-semibold tracking-[-0.03em]">TaskDo</h1>
                    {isPremium ? <PremiumBadge size="sm" /> : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Welcome back, {user?.name ?? 'there'}. Your tasks are synced to your account.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {!isPremium ? (
                  <Button
                    className="h-10 bg-gradient-to-r from-amber-500 to-orange-500 px-4 hover:from-amber-600 hover:to-orange-600"
                    onClick={() => {
                      setUpgradeModalTrigger('manual');
                      setShowUpgradeModal(true);
                    }}
                    size="sm"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade
                  </Button>
                ) : null}

                <Button
                  className="relative"
                  onClick={() => setCurrentScreen('notifications')}
                  size="icon"
                  variant="ghost"
                >
                  <Bell className="h-5 w-5" />
                  {activeTasks.filter((task) => task.notificationEnabled).length > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {activeTasks.filter((task) => task.notificationEnabled).length}
                    </span>
                  ) : null}
                </Button>

                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                <Button variant="ghost" size="icon" onClick={() => setCurrentScreen('settings')}>
                  <Settings className="h-5 w-5" />
                </Button>

                <div className="hidden items-center gap-3 rounded-full border border-white/40 bg-white/65 px-2.5 py-2 shadow-sm backdrop-blur sm:flex">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {userInitial}
                  </div>
                  <div className="pr-2">
                    <p className="text-sm font-medium leading-5">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <Button className="rounded-full" onClick={() => void signOut()} variant="outline">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <div className="surface-panel rounded-[1.9rem] border border-white/40 p-5 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em]">Focus dashboard</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      A structured snapshot of what needs attention next.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 lg:grid-cols-1">
                  {prioritySummary.map((item) => (
                    <div key={item.label} className="rounded-2xl bg-muted/60 p-3 lg:p-4">
                      <div className={`text-2xl font-bold ${item.tone}`}>{item.value}</div>
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>

                {!isPremium ? (
                  <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Active tasks</p>
                        <p className="text-2xl font-bold">
                          {activeTasks.length} / {FREE_TASK_LIMIT}
                        </p>
                      </div>
                      <Button
                        className="h-9 px-3"
                        onClick={() => {
                          setUpgradeModalTrigger(taskLimitReached ? 'task_limit' : 'manual');
                          setShowUpgradeModal(true);
                        }}
                        variant={taskLimitReached ? 'default' : 'outline'}
                      >
                        Upgrade
                      </Button>
                    </div>

                    {!taskLimitReached && activeTasks.length >= FREE_TASK_LIMIT - 10 ? (
                      <p className="mt-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
                        You are getting close to the free plan limit.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-sm font-medium text-foreground">Premium is active</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Unlimited tasks and account controls are ready whenever you need them.
                    </p>
                  </div>
                )}
              </div>

              <div className="surface-panel rounded-[1.9rem] border border-white/40 p-5 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Account</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user?.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Button className="mt-4 w-full" onClick={() => void signOut()} variant="outline">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </aside>

            <section className="min-w-0">
              <div className="surface-panel mb-5 rounded-[1.9rem] border border-white/40 p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Today&apos;s flow</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isTasksLoading
                        ? 'Loading your tasks...'
                        : activeTasks.length === 0
                        ? 'You are clear for now. Add a task when something new comes up.'
                        : `${activeTasks.length} active task${activeTasks.length === 1 ? '' : 's'} across your current priorities.`}
                    </p>
                  </div>

                  <div className="rounded-full border border-white/40 bg-white/65 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
                    {completedTasks.length} completed today
                  </div>
                </div>
              </div>

              {activeTasks.length === 0 && !isTasksLoading ? (
                <div className="surface-panel rounded-[1.9rem] border border-white/40 px-4 py-12 text-center shadow-sm sm:px-6">
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="mb-4 inline-flex rounded-full bg-muted p-4 transition hover:scale-105 hover:bg-muted/80"
                    aria-label="Add task"
                  >
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </button>
                  <h3 className="mb-2 font-semibold">No tasks yet</h3>
                  <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                    Keep the list light. Add your next task only when it deserves attention.
                  </p>
                </div>
              ) : null}
              <div className="space-y-6">
                {groupedTasks.high.length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
                ) : null}

                {groupedTasks.medium.length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
                ) : null}

                {groupedTasks.low.length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
                ) : null}

                {completedTasks.length > 0 ? (
                  <div className="surface-panel rounded-[1.9rem] border border-white/40 p-4 shadow-sm sm:p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Completed
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearCompleted}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
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
                ) : null}
              </div>
            </section>
          </div>

          <Button
            size="lg"
            className="fixed bottom-5 right-5 h-14 w-14 rounded-full shadow-lg sm:bottom-6 sm:right-6"
            onClick={handleAddTask}
          >
            <Plus className="h-6 w-6" />
          </Button>

          {taskLimitReached ? (
            <div className="fixed bottom-24 right-4 max-w-[11rem] rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow-lg sm:right-6">
              Free limit reached
            </div>
          ) : null}
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

      {currentScreen === 'settings' && (
        <SettingsScreen
          activeTaskCount={activeTasks.length}
          onClose={() => setCurrentScreen('home')}
          onUpgrade={() => {
            setCurrentScreen('home');
            setUpgradeModalTrigger('manual');
            setShowUpgradeModal(true);
          }}
        />
      )}

      {showUpgradeModal ? (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          trigger={upgradeModalTrigger}
        />
      ) : null}

      {alarmingTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-pulse">
          <div className="w-full max-w-sm rounded-3xl border-4 border-red-500 bg-background p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="relative rounded-full bg-red-500 p-6">
                  <Bell className="h-12 w-12 animate-bounce text-white" />
                </div>
              </div>
            </div>

            <div className="mb-6 text-center">
              <h2 className="mb-2 text-2xl font-bold">Task Reminder!</h2>
              <h3 className="mb-3 text-xl font-semibold text-red-500">{alarmingTask.name}</h3>
              {alarmingTask.description ? (
                <p className="mb-4 text-muted-foreground">{alarmingTask.description}</p>
              ) : null}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Bell className="h-4 w-4" />
                <span>
                  {new Date(alarmingTask.alarmTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button className="h-12 w-full" onClick={dismissAlarm} size="lg">
                Dismiss Alarm
              </Button>
              <Button variant="outline" className="h-12 w-full" onClick={snoozeAlarm} size="lg">
                Snooze (5 min)
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </ThemeProvider>
  );
}
