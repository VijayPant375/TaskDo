import { useEffect, useState } from 'react';
import type { Task } from '../../types/task';

export type AppScreen = 'home' | 'add' | 'edit' | 'notifications' | 'settings' | 'success';
export type UpgradeModalTrigger = 'manual' | 'task_limit' | 'feature_locked';

export function useAppScreenState() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalTrigger, setUpgradeModalTrigger] = useState<UpgradeModalTrigger>('manual');

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

  const openUpgradeModal = (trigger: UpgradeModalTrigger) => {
    setUpgradeModalTrigger(trigger);
    setShowUpgradeModal(true);
  };

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false);
  };

  const beginEditTask = (task: Task) => {
    setEditingTask(task);
    setCurrentScreen('edit');
  };

  const beginAddTask = () => {
    setEditingTask(null);
    setCurrentScreen('add');
  };

  const finishTaskEditor = () => {
    setEditingTask(null);
    setCurrentScreen('home');
  };

  const completeCheckoutFlow = () => {
    setCheckoutSessionId(null);
    setCurrentScreen('home');
    window.history.replaceState({}, '', window.location.pathname);
  };

  return {
    beginAddTask,
    beginEditTask,
    checkoutSessionId,
    closeUpgradeModal,
    completeCheckoutFlow,
    currentScreen,
    editingTask,
    finishTaskEditor,
    openUpgradeModal,
    setCurrentScreen,
    showUpgradeModal,
    upgradeModalTrigger,
  };
}
