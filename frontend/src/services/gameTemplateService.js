import { apiCall } from './api.js';

export const listGameTemplates = async (groupId) => {
  try {
    const data = await apiCall(`/groups/${groupId}/templates`, {
      method: 'GET',
    });

    return {
      success: true,
      templates: data.templates || [],
    };
  } catch (error) {
    console.error('Failed to load game templates:', error);
    return { success: false, error: error.message };
  }
};

export const createGameTemplate = async (groupId, templateData) => {
  try {
    const data = await apiCall(`/groups/${groupId}/templates`, {
      method: 'POST',
      body: JSON.stringify(templateData),
    });

    return { success: true, template: data.template };
  } catch (error) {
    console.error('Failed to create game template:', error);
    return { success: false, error: error.message };
  }
};

export const updateGameTemplate = async (groupId, templateId, templateData) => {
  try {
    const data = await apiCall(`/groups/${groupId}/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });

    return { success: true, template: data.template };
  } catch (error) {
    console.error('Failed to update game template:', error);
    return { success: false, error: error.message };
  }
};

export const deleteGameTemplate = async (groupId, templateId) => {
  try {
    const data = await apiCall(`/groups/${groupId}/templates/${templateId}`, {
      method: 'DELETE',
    });

    return { success: true, message: data.message };
  } catch (error) {
    console.error('Failed to delete game template:', error);
    return { success: false, error: error.message };
  }
};
