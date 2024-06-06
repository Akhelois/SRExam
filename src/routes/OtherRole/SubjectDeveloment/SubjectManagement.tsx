import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';
import 'tailwindcss/tailwind.css';
import ExamCoordinatorNavBarComponent from "../../../components/ExamCoordinator/NavBarComponents";
import SubjectDevelopmentNavBarComponent from "../../../components/SubjectDevelopment/NavBarComponent";

type Subject = {
  subject_code_str: string;
  subject_name: string;
};

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
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

    const fetchData = async () => {
      try {
        const fetchedSubjects = await invoke<Subject[]>('get_all_subject');
        setSubjects(fetchedSubjects);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };

    fetchData();
  }, []);

  const filteredSubjects = subjects.filter(
    (subject) =>
      (subject.subject_code_str && subject.subject_code_str.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (subject.subject_name && subject.subject_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )  

  let NavBarComponent;

  if (currentUser?.role === 'Exam Coordinator') {
      NavBarComponent = ExamCoordinatorNavBarComponent;
  } else if (currentUser?.role === 'Subject Development') {
      NavBarComponent = SubjectDevelopmentNavBarComponent;
  } 

  return (
    <div className='h-screen'>
        {NavBarComponent && <NavBarComponent />}
        <div className="container mx-auto py-8 text-black">
        <h1 className="text-2xl font-bold mb-4 text-white">Subject Management</h1>
        <div className="mb-4 text-white">
            <input
            type="text"
            placeholder="Search by subject code or name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 w-100 border rounded"
            />
        </div>
        <table className="min-w-full bg-white border">
            <thead>
            <tr>
                <th className="px-4 py-2">Subject Code</th>
                <th className="px-4 py-2">Subject Name</th>
            </tr>
            </thead>
            <tbody>
            {filteredSubjects.map((subject, index) => (
                <tr key={index}>
                <td className="border px-4 py-2">{subject.subject_code_str}</td>
                <td className="border px-4 py-2">{subject.subject_name}</td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    </div>
  );
}