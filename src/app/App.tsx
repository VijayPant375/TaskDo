import { useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Plus, Bell, Sun, Moon, Trash2 } from 'lucide-react';
import { Button } from './components/ui/button';
import { TaskCard, Task } from './components/TaskCard';
import { AddEditTaskScreen } from './components/AddEditTaskScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { useTheme } from 'next-themes';

function AppContent() {
  const { theme, setTheme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'add' | 'edit' | 'notifications'>('home');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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