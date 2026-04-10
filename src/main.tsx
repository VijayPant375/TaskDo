
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { AuthProvider } from "./context/AuthContext.tsx";
  import { AppErrorBoundary } from "./app/components/AppErrorBoundary.tsx";

  createRoot(document.getElementById("root")!).render(
    <AppErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppErrorBoundary>
  );
  
