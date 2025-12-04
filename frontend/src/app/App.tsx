import { Routes, Route } from "react-router-dom";

import Dashboard from "../features/project/pages/Dashboard";
import ProjectDetails from "../features/project/pages/ProjectDetails";
import NewProject from "../features/project/pages/NewProject";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/projects/:id" element={<ProjectDetails />} />
      <Route path="/projects/new" element={<NewProject />} />
    </Routes>
  );
}
