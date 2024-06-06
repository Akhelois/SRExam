import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "./routes/HomePage";
import LoginPage from "./routes/LoginPage";
import ProfilePage from './routes/ProfilePage';
import OtherRoleHomePage from './routes/OtherRole/HomePage';
import ViewSchedulePage from './routes/OtherRole/SubjectDeveloment/ExamCoordinator/ViewShedulePage';
import SubjectManagement from "./routes/OtherRole/SubjectDeveloment/SubjectManagement";
import UserManagement from "./routes/OtherRole/SubjectDeveloment/ExamCoordinator/UserManagement";
import RoomManagement from "./routes/OtherRole/SubjectDeveloment/ExamCoordinator/RoomManagement";
import ExamScheduler from "./routes/OtherRole/SubjectDeveloment/ExamCoordinator/ExamScheduler";
import ExamTransactionDetail from "./routes/OtherRole/ExamTransactionDetail";
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage/>
  },
  {
    path: "/home",
    element: <HomePage/>
  },
  {
    path: "/other_role_home_page",
    element: <OtherRoleHomePage/>
  },
  {
    path: "/profile_page",
    element: <ProfilePage/>
  },
  {
    path: "/view_schedule",
    element: <ViewSchedulePage/>
  },
  {
    path: "/subject_management",
    element: <SubjectManagement/>
  },
  {
    path: "/user_management",
    element: <UserManagement/>
  },
  {
    path: "/room_management",
    element: <RoomManagement/>
  },
  {
    path: "/exam_scheduler",
    element: <ExamScheduler/>
  },
  {
    path: "/exam_transaction_detail",
    // element: <ExamTransactionDetail/>
  }
])

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
  </QueryClientProvider>
);
