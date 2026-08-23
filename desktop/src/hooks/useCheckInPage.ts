import { useCallback, useState } from 'react';
import { useUserStore } from '@/hooks/useUserStore';
import { useI18n } from '@/hooks/useI18n';
import {
  checkInStatusGradient,
  formatCheckInRequestError,
  requestForumCheckIn,
  type CheckInResult,
} from '@/services/forumCheckIn';
import { openCheckInForumWindow } from '@/services/forumWindow';

export function useCheckInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoggedIn, openLoginModal } = useUserStore();
  const { t } = useI18n();

  const handleCheckIn = useCallback(async () => {
    if (!isLoggedIn || !user) {
      openLoginModal();
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      setResult(await requestForumCheckIn(user.uid, user.user_auth));
    } catch (err) {
      setError(formatCheckInRequestError(err));
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, user, openLoginModal]);

  return {
    isLoading,
    result,
    error,
    user,
    isLoggedIn,
    openLoginModal,
    t,
    handleCheckIn,
    handleOpenForum: openCheckInForumWindow,
    statusGradient: result ? checkInStatusGradient(result.status) : '',
  };
}

