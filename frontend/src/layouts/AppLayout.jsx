import { Outlet } from "react-router-dom";

import BottomNav from "../components/navigation/BottomNav/BottomNav.jsx";

const AppLayout = () => {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
};

export default AppLayout;
