const KEY = 'adminToken';

/** Closing the tab/window clears the token — reopening requires signing in again */
export const getAdminToken = () => sessionStorage.getItem(KEY);

export const setAdminToken = (token) => {
  sessionStorage.setItem(KEY, token);
};

export const clearAdminToken = () => {
  sessionStorage.removeItem(KEY);
};
