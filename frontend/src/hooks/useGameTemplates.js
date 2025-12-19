import { useState, useEffect } from 'react';
import { listGameTemplates } from '../services/gameTemplateService.js';

export const useGameTemplates = (groupId) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTemplates = async () => {
    if (!groupId) {
      setTemplates([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await listGameTemplates(groupId);
      if (result.success) {
        setTemplates(result.templates);
      } else {
        setError(result.error);
        setTemplates([]);
      }
    } catch (err) {
      setError(err.message);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [groupId]);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
  };
};
