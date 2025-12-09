import { RouteObject } from "react-router-dom";
import Dashboard from "../features/project/pages/Dashboard";
import ProjectDetails from "../features/project/pages/ProjectDetails";
import NewProject from "../features/project/pages/NewProject";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Dashboard />,
  },
  {
    path: "/projects/:id",
    element: <ProjectDetails />,
  },
  {
    path: "/projects/new",
    element: <NewProject />,
  },
];
