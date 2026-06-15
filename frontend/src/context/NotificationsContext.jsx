import { createContext, useContext, useState } from "react";

const NotificationsContext = createContext({
  unreadCount: 0,
  setUnreadCount: () => {},
});

export const NotificationsProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <NotificationsContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotificationsCtx = () => useContext(NotificationsContext);
