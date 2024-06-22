import React, { useEffect, useState, ChangeEvent } from 'react';
import { invoke } from '@tauri-apps/api';
import ExamCoordinatorNavBarComponent from "../../../components/ExamCoordinator/NavBarComponents";
import SubjectDevelopmentNavBarComponent from "../../../components/SubjectDevelopment/NavBarComponent";

type User = {
  bn_number: string;
  nim: string;
  name: string;
  major: string;
  role: string;
  initial?: string;
}

type Subject = {
  subject_code_str: string;
  subject_name: string;
}

type Room = {
  campus: string;
  room_capacity: number;
  room_number_str: string;
}

type Enrollment = {
  class_code_str: string;
  nim: string;
  subject_code: string;
}

type Shift = {
  shift_id: string;
  start_time: string;
  end_time: string;
}

type ExamTransaction = {
  transaction_id: string;
  subject_code: string;
  room_number: string;
  shift_id: string;
  transaction_date: string;
  proctor?: string;
  status?: string;
}

export default function ReportManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [examTransactions, setExamTransactions] = useState<ExamTransaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [open, setOpen] = useState<boolean>(false);
  const [dialogData, setDialogData] = useState<ExamTransaction | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    invoke('get_all_users').then((response: any) => {
      setUsers(response);
      setCurrentUser(response[0]);
    });
    invoke('get_all_subjects').then((response: any) => setSubjects(response));
    invoke('get_all_rooms').then((response: any) => setRooms(response));
    invoke('get_all_enrollments').then((response: any) => setEnrollments(response));
    invoke('get_all_shifts').then((response: any) => setShifts(response));
    invoke('get_exam_transactions').then((response: any) => setExamTransactions(response));
  }, []);

  const handleDialogOpen = (transaction: ExamTransaction) => {
    setDialogData(transaction);
    setOpen(true);
  };

  const handleDialogClose = () => {
    setOpen(false);
    setDialogData(null);
  };

  const handleSave = () => {
    if (dialogData) {
      invoke('update_exam_transaction', { ...dialogData })
        .then(() => {
          setExamTransactions((prev) =>
            prev.map((trans) =>
              trans.transaction_id === dialogData.transaction_id ? dialogData : trans
            )
          );
          handleDialogClose();
        })
        .catch((err) => console.error(err));
    }
  };

  let NavBarComponent;

  if (currentUser?.role === 'Exam Coordinator') {
    NavBarComponent = ExamCoordinatorNavBarComponent;
  } else if (currentUser?.role === 'Subject Development') {
    NavBarComponent = SubjectDevelopmentNavBarComponent;
  }

  return (
    <div className="h-screen">
      {NavBarComponent && <NavBarComponent />}
      <div className="container mx-auto p-4">
        <h4 className="text-2xl font-bold mb-4">Report Management</h4>

        <input
          type="date"
          value={selectedDate}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
          className="block mb-4 p-2 border border-gray-300 rounded"
        />

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-black">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Transaction ID</th>
                <th className="py-2 px-4 border-b">Subject Code</th>
                <th className="py-2 px-4 border-b">Room Number</th>
                <th className="py-2 px-4 border-b">Shift ID</th>
                <th className="py-2 px-4 border-b">Transaction Date</th>
                <th className="py-2 px-4 border-b">Proctor</th>
                <th className="py-2 px-4 border-b">Status</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {examTransactions.map((transaction) => (
                <tr key={transaction.transaction_id}>
                  <td className="py-2 px-4 border-b">{transaction.transaction_id}</td>
                  <td className="py-2 px-4 border-b">{transaction.subject_code}</td>
                  <td className="py-2 px-4 border-b">{transaction.room_number}</td>
                  <td className="py-2 px-4 border-b">{transaction.shift_id}</td>
                  <td className="py-2 px-4 border-b">{transaction.transaction_date}</td>
                  <td className="py-2 px-4 border-b">{transaction.proctor}</td>
                  <td className="py-2 px-4 border-b">{transaction.status}</td>
                  <td className="py-2 px-4 border-b">
                    <button
                      className="bg-blue-500 text-white py-1 px-2 rounded"
                      onClick={() => handleDialogOpen(transaction)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {open && dialogData && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-4 rounded shadow-lg">
              <h2 className="text-xl font-bold mb-2">Edit Exam Transaction</h2>
              <p className="mb-4">Modify the details of the exam transaction.</p>
              <input
                type="text"
                value={dialogData.proctor || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDialogData({ ...dialogData, proctor: e.target.value } as ExamTransaction)
                }
                placeholder="Proctor"
                className="block mb-2 p-2 border border-gray-300 rounded w-full"
              />
              <input
                type="text"
                value={dialogData.status || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDialogData({ ...dialogData, status: e.target.value } as ExamTransaction)
                }
                placeholder="Status"
                className="block mb-4 p-2 border border-gray-300 rounded w-full"
              />
              <div className="flex justify-end">
                <button
                  className="bg-gray-500 text-white py-1 px-2 rounded mr-2"
                  onClick={handleDialogClose}
                >
                  Cancel
                </button>
                <button
                  className="bg-blue-500 text-white py-1 px-2 rounded"
                  onClick={handleSave}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}