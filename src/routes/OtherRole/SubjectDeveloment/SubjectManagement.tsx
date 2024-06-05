import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';
import 'tailwindcss/tailwind.css';
import NavBarComponent from "../../../components/ExamCoordinator/NavBarComponents";

type Subject = {
  subject_code: string;
  subject_name: string;
};

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
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
      subject.subject_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className='h-screen'>
        <NavBarComponent/>
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
                <td className="border px-4 py-2">{subject.subject_code}</td>
                <td className="border px-4 py-2">{subject.subject_name}</td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    </div>
  );
}