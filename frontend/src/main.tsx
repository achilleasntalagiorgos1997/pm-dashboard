// src/main.tsx
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { AppProviders } from "./app/AppProviders";
import "./app/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <AppProviders>
    <App />
  </AppProviders>
);
