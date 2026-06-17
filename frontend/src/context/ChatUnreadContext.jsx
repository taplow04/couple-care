import { createContext, useContext, useState } from "react";

// App-wide unread chat-message count (the dashboard chat icon badge). Mirrors
// NotificationsContext. Seeded + kept live by the useChatUnread hook.
const ChatUnreadContext = createContext({
  unreadChats: 0,
  setUnreadChats: () => {},
});

export const ChatUnreadProvider = ({ children }) => {
  const [unreadChats, setUnreadChats] = useState(0);

  return (
    <ChatUnreadContext.Provider value={{ unreadChats, setUnreadChats }}>
      {children}
    </ChatUnreadContext.Provider>
  );
};

export const useChatUnreadCtx = () => useContext(ChatUnreadContext);
