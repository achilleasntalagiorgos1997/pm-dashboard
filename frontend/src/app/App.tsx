import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "../features/project/pages/Dashboard";
import NewProject from "../features/project/pages/NewProject"; // new page
import ProjectDetails from "../features/project/pages/ProjectDetails";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/projects/new" element={<NewProject />} />
      </Routes>
    </Router>
  );
}
