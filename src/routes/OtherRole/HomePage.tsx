import { useEffect, useState } from "react";
import ExamCoordinatorNavBarComponent from "../../components/ExamCoordinator/NavBarComponents";
import AssistantNavBarComponent from "../../components/NavBarComponent";
import SubjectDevelopmentNavBarComponent from "../../components/SubjectDevelopment/NavBarComponent";
import { invoke } from "@tauri-apps/api";
import { Link as RouterLink, useLocation } from 'react-router-dom';

type ExamTransaction = {
  transaction_id: string;
  subject_code: string;
  room_number: string;
  shift_id: string;
  transaction_date: string;
  transaction_time: string;
  seat_number: string;
  status: string;
};  

type User = {
  bn_number: string;
  nim: string;
  name: string;
  major: string;
  role: string;
  initial?: string;
};

export default function HomePage() {
  const [examTransactions, setExamTransactions] = useState<ExamTransaction[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState("Welcome!");

  useEffect(() => {
    invoke<{ user: User }>('get_current_user').then((currentUser) => {
      if (currentUser && currentUser.user) {
        setCurrentUser(currentUser.user);
        setGreeting(`Welcome ${currentUser.user.role}`);
      } else {
        setCurrentUser(null);
        setGreeting("Welcome Guest");
      }
    }).catch((error) => {
      console.error('Failed to fetch current user:', error);
    });

    invoke<ExamTransaction[]>('get_exam_transaction').then((transactions) => {
      setExamTransactions(transactions);
    }).catch((error) => {
      console.error('Failed to fetch exam transactions:', error);
    });
  }, []);

  let NavBarComponent;

  if (currentUser?.role === 'Exam Coordinator') {
    NavBarComponent = ExamCoordinatorNavBarComponent;
  } else if (currentUser?.role === 'Subject Development') {
    NavBarComponent = SubjectDevelopmentNavBarComponent;
  } else {
    NavBarComponent = AssistantNavBarComponent;
  }

  return (
    <div className="h-screen">
      <NavBarComponent />
      <div className="container mx-auto p-4">
        <h1 className="text-white text-2xl mb-4">
          {greeting}
        </h1>
        <div className="bg-white p-4 rounded shadow">
          {examTransactions.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {examTransactions.map((transaction) => (
                <li key={transaction.transaction_id} className="py-2">
                  <div className="flex justify-between text-gray-700">
                    <span className="flex-1">{transaction.subject_code}</span>
                    <span className="flex-1">{transaction.room_number}</span>
                    <span className="flex-1">{transaction.shift_id}</span>
                    <span className="flex-1">{transaction.transaction_date}</span>
                    <span className="flex-1">{transaction.transaction_time}</span>
                    <span className="flex-1">{transaction.seat_number}</span>
                    <span className="flex-1">{transaction.status}</span>
                    <RouterLink to={"/exam_transaction_detail"}>
                      <a href="" className="flex-1"> ? </a>
                    </RouterLink>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-700">No exam transactions found.</p>
          )}
        </div>
      </div>
    </div>
  );
}