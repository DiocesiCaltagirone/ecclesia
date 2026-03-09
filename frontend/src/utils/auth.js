export const logout = (navigate) => {
  sessionStorage.clear();
  navigate('/login');
};
