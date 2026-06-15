import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import AuthLoader from "../context/AuthLoader/AuthLoader";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoader />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
