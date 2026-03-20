import { create } from 'zustand';
import { api } from '../lib/api';

interface FeedbackState {
  submitting: boolean;
  submitFeedback: (queryId: string, rating: 'thumbs_up' | 'thumbs_down', comment?: string) => Promise<void>;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  submitting: false,
  submitFeedback: async (queryId, rating, comment) => {
    set({ submitting: true });
    try {
      await api.submitFeedback({ query_id: queryId, rating, comment });
    } finally {
      set({ submitting: false });
    }
  },
}));
